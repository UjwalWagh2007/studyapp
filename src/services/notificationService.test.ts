import { describe, it, expect } from 'vitest';
import {
  generateMeaningfulNotifications,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notificationService';
import type { Question, UpcomingContest, StudyGoal, NotificationPreferences } from '../types';

describe('Part 12: Meaningful Notifications Service', () => {
  const baseDate = new Date('2026-10-03T09:00:00.000Z'); // Saturday

  it('generates high-signal notifications for due reviews, Saturday mock, and upcoming contests', () => {
    const mockQuestions = [
      {
        id: 'q1',
        title: 'Merge Intervals',
        nextReviewAt: '2026-10-03',
        isArchived: false,
      } as unknown as Question,
      {
        id: 'q2',
        title: 'Trapping Rain Water',
        nextReviewAt: '2026-10-01', // Overdue
        isArchived: false,
      } as unknown as Question,
    ];

    const mockContests: UpcomingContest[] = [
      {
        id: 'c1',
        platform: 'leetcode',
        platformName: 'LeetCode',
        name: 'Weekly Contest 418',
        startTime: new Date(baseDate.getTime() + 2 * 3600 * 1000).toISOString(), // in 2 hours
        durationSeconds: 5400,
        url: 'https://leetcode.com',
      },
    ];

    const mockGoals: StudyGoal[] = [
      {
        id: 'g1',
        title: 'Master 20 Patterns',
        description: '',
        horizon: 'WEEKLY',
        type: 'MASTERED_PATTERNS',
        targetValue: 20,
        unit: 'patterns',
        autoTrack: true,
        deadline: '2026-10-04', // tomorrow
        isCompleted: false,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const notifs = generateMeaningfulNotifications(
      mockQuestions,
      mockContests,
      mockGoals,
      14, // 14 day streak milestone
      DEFAULT_NOTIFICATION_PREFERENCES,
      baseDate
    );

    expect(notifs.length).toBeGreaterThanOrEqual(4);

    // 1. Overdue notification
    const overdueNotif = notifs.find((n) => n.title.includes('Overdue'));
    expect(overdueNotif).toBeDefined();
    expect(overdueNotif?.message).toContain('1 spaced repetition card');

    // 2. Due today notification
    const dueTodayNotif = notifs.find((n) => n.title.includes('Due Today'));
    expect(dueTodayNotif).toBeDefined();
    expect(dueTodayNotif?.message).toContain('1 revision');

    // 3. Saturday Mock reminder
    const mockNotif = notifs.find((n) => n.category === 'WEEKLY_MOCK');
    expect(mockNotif).toBeDefined();
    expect(mockNotif?.message).toContain('timed interview simulation');

    // 4. Contest starting soon reminder
    const contestNotif = notifs.find((n) => n.category === 'CONTESTS');
    expect(contestNotif).toBeDefined();
    expect(contestNotif?.message).toContain('Weekly Contest 418');

    // 5. Streak milestone
    const streakNotif = notifs.find((n) => n.category === 'STREAK');
    expect(streakNotif).toBeDefined();
    expect(streakNotif?.title).toContain('14-Day Study Streak');
  });

  it('respects user category preferences and global disable toggle', () => {
    const mockQuestions = [
      {
        id: 'q1',
        title: 'LRU Cache',
        nextReviewAt: '2026-10-03',
        isArchived: false,
      } as unknown as Question,
    ];

    // Disabled preferences
    const disabledPrefs: NotificationPreferences = {
      enabled: false,
      preferredTime: 'ALL_DAY',
      categories: {
        srsRevisions: true,
        weeklyMock: true,
        sundaySpecial: true,
        contests: true,
        goals: true,
        streaks: true,
      },
    };

    const notifsDisabled = generateMeaningfulNotifications(
      mockQuestions,
      [],
      [],
      0,
      disabledPrefs,
      baseDate
    );
    expect(notifsDisabled.length).toBe(0);

    // Selectively disabled category
    const selectivePrefs: NotificationPreferences = {
      enabled: true,
      preferredTime: 'ALL_DAY',
      categories: {
        srsRevisions: false, // Turned OFF
        weeklyMock: true,
        sundaySpecial: true,
        contests: true,
        goals: true,
        streaks: true,
      },
    };

    const notifsSelective = generateMeaningfulNotifications(
      mockQuestions,
      [],
      [],
      0,
      selectivePrefs,
      baseDate
    );
    expect(notifsSelective.some((n) => n.category === 'SRS_REVISIONS')).toBe(false);
  });
});
