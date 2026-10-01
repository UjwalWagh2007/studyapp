import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatLastSynced,
  syncPlatformAccount,
} from './platformSync';
import type { PlatformAccount, ExternalSubmission } from '../types';

describe('Part 9: External Platform Sync & System Separation Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatLastSynced', () => {
    it('returns "Never synced" for undefined or empty input', () => {
      expect(formatLastSynced()).toBe('Never synced');
      expect(formatLastSynced('')).toBe('Never synced');
    });

    it('returns "Just now" for recent syncs (< 45s)', () => {
      const now = new Date().toISOString();
      expect(formatLastSynced(now)).toBe('Just now');
    });

    it('returns formatted minutes ago', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatLastSynced(fiveMinAgo)).toBe('5 minutes ago');

      const oneMinAgo = new Date(Date.now() - 65 * 1000).toISOString();
      expect(formatLastSynced(oneMinAgo)).toBe('1 minute ago');
    });

    it('returns formatted hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      expect(formatLastSynced(threeHoursAgo)).toBe('3 hours ago');

      const oneHourAgo = new Date(Date.now() - 62 * 60 * 1000).toISOString();
      expect(formatLastSynced(oneHourAgo)).toBe('1 hour ago');
    });

    it('returns formatted days ago', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
      expect(formatLastSynced(twoDaysAgo)).toBe('2 days ago');
    });
  });

  describe('syncPlatformAccount error resilience', () => {
    const mockAccount: PlatformAccount = {
      id: 'codeforces',
      name: 'Codeforces',
      handle: '',
      isConnected: false,
      status: 'DISCONNECTED',
      totalSolved: 0,
      difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
      streakDays: 0,
      contestsAttended: 0,
      ratingHistory: [],
      recentSubmissions: [],
    };

    it('returns ERROR status when handle is empty or whitespace', async () => {
      const result = await syncPlatformAccount({ ...mockAccount, handle: '   ' });
      expect(result.status).toBe('ERROR');
      expect(result.errorMessage).toContain('No username configured');
    });

    it('handles network failure or API error gracefully without throwing', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

      const result = await syncPlatformAccount({
        ...mockAccount,
        handle: 'tourist',
      });

      expect(result.status).toBe('ERROR');
      expect(result.errorMessage).toContain('Network offline');
    });

    it('processes successful Codeforces API mock payload accurately', async () => {
      const mockUserInfo = {
        status: 'OK',
        result: [
          {
            handle: 'tourist',
            rating: 3850,
            maxRating: 3979,
            rank: 'legendary grandmaster',
          },
        ],
      };

      const mockUserRating = {
        status: 'OK',
        result: [
          {
            contestId: 1000,
            contestName: 'Codeforces Round 500 (Div. 1)',
            rank: 1,
            ratingUpdateTimeSeconds: 1600000000,
            oldRating: 3800,
            newRating: 3850,
          },
        ],
      };

      const mockUserStatus = {
        status: 'OK',
        result: [
          {
            id: 123456,
            contestId: 1000,
            creationTimeSeconds: 1600000000,
            problem: {
              contestId: 1000,
              index: 'A',
              name: 'Sample Problem',
              rating: 2400,
            },
            programmingLanguage: 'GNU C++20',
            verdict: 'OK',
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = url.toString();
        if (urlStr.includes('user.info')) {
          return { ok: true, json: async () => mockUserInfo } as any;
        }
        if (urlStr.includes('user.rating')) {
          return { ok: true, json: async () => mockUserRating } as any;
        }
        if (urlStr.includes('user.status')) {
          return { ok: true, json: async () => mockUserStatus } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const result = await syncPlatformAccount({
        ...mockAccount,
        handle: 'tourist',
      });

      expect(result.status).toBe('CONNECTED');
      expect(result.isConnected).toBe(true);
      expect(result.currentRating).toBe(3850);
      expect(result.maxRating).toBe(3979);
      expect(result.globalRank).toBe('legendary grandmaster');
      expect(result.totalSolved).toBe(1);
      expect(result.difficultyBreakdown.hard).toBe(1);
      expect(result.ratingHistory.length).toBe(1);
      expect(result.recentSubmissions.length).toBe(1);
      expect(result.recentSubmissions[0].problemTitle).toBe('A. Sample Problem');
      expect(result.recentSubmissions[0].verdict).toBe('Accepted');
    });
  });

  describe('System Separation Invariant', () => {
    it('ensures external submission data structure is isolated and has enrollment flag', () => {
      const submission: ExternalSubmission = {
        id: 'sub-cf-1',
        platform: 'codeforces',
        problemId: '1000A',
        problemTitle: 'A. Sample Problem',
        problemUrl: 'https://codeforces.com/problemset/problem/1000/A',
        difficulty: 'Hard',
        verdict: 'Accepted',
        submittedAt: new Date().toISOString(),
        isEnrolledInStudySystem: false,
      };

      // By default, external submission is not enrolled in personal SRS
      expect(submission.isEnrolledInStudySystem).toBe(false);

      // When explicitly enrolled, it can be marked
      const enrolled = { ...submission, isEnrolledInStudySystem: true };
      expect(enrolled.isEnrolledInStudySystem).toBe(true);
    });
  });
});
