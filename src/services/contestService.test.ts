import { describe, it, expect } from 'vitest';
import {
  calculateContestAnalysis,
  formatCountdown,
  formatContestDuration,
} from './contestService';
import type { ContestRecord, ContestJournalEntry } from '../types';

describe('Part 10: Contest Analysis, Rating History & Contest Journal Service', () => {
  describe('calculateContestAnalysis', () => {
    it('returns empty stats structure when no contests are provided', () => {
      const result = calculateContestAnalysis([]);
      expect(result.totalContests).toBe(0);
      expect(result.averageProblemsSolved).toBe(0);
      expect(result.averageRank).toBe(0);
      expect(result.averageRatingDelta).toBe(0);
      expect(result.bestRank).toBe(0);
      expect(result.peakRating).toBe(0);
      expect(result.topWeakConcepts).toEqual([]);
    });

    it('calculates deterministic metrics from past contest records', () => {
      const mockContests: ContestRecord[] = [
        {
          id: 'c1',
          platform: 'codeforces',
          platformName: 'Codeforces',
          contestName: 'Round 950',
          date: '2026-09-01T10:00:00.000Z',
          rank: 1200,
          ratingBefore: 1600,
          ratingAfter: 1650,
          ratingChange: +50,
          problemsSolved: 4,
          totalProblems: 6,
          problemsPerformance: [
            { problemIndex: 'A', problemTitle: 'P1', difficulty: 'Easy', verdict: 'AC' },
            { problemIndex: 'B', problemTitle: 'P2', difficulty: 'Easy', verdict: 'AC' },
            { problemIndex: 'C', problemTitle: 'P3', difficulty: 'Medium', verdict: 'AC' },
            { problemIndex: 'D', problemTitle: 'P4', difficulty: 'Hard', verdict: 'AC' },
          ],
        },
        {
          id: 'c2',
          platform: 'codeforces',
          platformName: 'Codeforces',
          contestName: 'Round 951',
          date: '2026-09-15T10:00:00.000Z',
          rank: 2400,
          ratingBefore: 1650,
          ratingAfter: 1630,
          ratingChange: -20,
          problemsSolved: 2,
          totalProblems: 6,
          problemsPerformance: [
            { problemIndex: 'A', problemTitle: 'P1', difficulty: 'Easy', verdict: 'AC' },
            { problemIndex: 'B', problemTitle: 'P2', difficulty: 'Medium', verdict: 'AC' },
            { problemIndex: 'C', problemTitle: 'P3', difficulty: 'Hard', verdict: 'WA' },
          ],
        },
      ];

      const mockJournals: ContestJournalEntry[] = [
        {
          id: 'j1',
          contestId: 'c2',
          contestName: 'Round 951',
          platform: 'codeforces',
          date: '2026-09-15T12:00:00.000Z',
          whatWentWell: 'Fast A',
          whatWentWrong: 'Stuck on C',
          conceptsThatCausedProblems: ['Segment Tree', 'Binary Search'],
          whatToPractice: 'Segment Tree lazy propagation',
          linkedTopicIds: [],
          linkedPatterns: [],
          createdAt: '2026-09-15T12:00:00.000Z',
          updatedAt: '2026-09-15T12:00:00.000Z',
        },
      ];

      const result = calculateContestAnalysis(mockContests, mockJournals);

      expect(result.totalContests).toBe(2);
      expect(result.averageProblemsSolved).toBe(3); // (4 + 2) / 2
      expect(result.averageRank).toBe(1800); // (1200 + 2400) / 2
      expect(result.averageRatingDelta).toBe(15); // (50 - 20) / 2
      expect(result.bestRank).toBe(1200);
      expect(result.peakRating).toBe(1650);
      expect(result.difficultySolveCounts.easy).toBe(3);
      expect(result.difficultySolveCounts.medium).toBe(2);
      expect(result.difficultySolveCounts.hard).toBe(1);

      expect(result.topWeakConcepts).toEqual([
        { concept: 'Segment Tree', count: 1 },
        { concept: 'Binary Search', count: 1 },
      ]);
    });
  });

  describe('formatCountdown', () => {
    it('returns "Live now / Started" for past timestamps', () => {
      const pastTime = new Date(Date.now() - 10000).toISOString();
      expect(formatCountdown(pastTime)).toBe('Live now / Started');
    });

    it('formats countdown in days and hours', () => {
      const twoDaysFromNow = new Date(Date.now() + (2 * 86400 + 3 * 3600) * 1000).toISOString();
      expect(formatCountdown(twoDaysFromNow)).toBe('in 2d 3h');
    });

    it('formats countdown in hours and minutes', () => {
      const fourHoursFromNow = new Date(Date.now() + (4 * 3600 + 25 * 60) * 1000).toISOString();
      expect(formatCountdown(fourHoursFromNow)).toBe('in 4h 25m');
    });

    it('formats countdown in minutes', () => {
      const thirtyMinsFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      expect(formatCountdown(thirtyMinsFromNow)).toBe('in 30m');
    });
  });

  describe('formatContestDuration', () => {
    it('formats exact hours', () => {
      expect(formatContestDuration(7200)).toBe('2 hrs');
      expect(formatContestDuration(10800)).toBe('3 hrs');
    });

    it('formats hours and minutes', () => {
      expect(formatContestDuration(5400)).toBe('1h 30m');
      expect(formatContestDuration(6000)).toBe('1h 40m');
    });
  });
});
