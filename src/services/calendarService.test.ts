import { describe, it, expect } from 'vitest';
import {
  buildUnifiedCalendarEvents,
  ACTIVITY_COLORS,
} from './calendarService';
import type { Question, StudySessionRecord, UpcomingContest, StudyGoal } from '../types';

describe('Part 12: Unified Calendar Service', () => {
  it('aggregates all six activity types across dates with correct colors and badges', () => {
    const mockQuestions: Question[] = [
      {
        id: 'q1',
        title: 'Two Sum',
        subject: 'DSA',
        topicId: 't1',
        difficulty: 'Easy',
        pattern: 'Hash Map',
        source: 'LeetCode',
        tags: [],
        status: 'REVIEWING',
        mastery: 3,
        isArchived: false,
        createdAt: '',
        updatedAt: '',
        nextReviewAt: '2026-10-01',
      } as unknown as Question,
    ];

    const mockSessions: StudySessionRecord[] = [
      {
        id: 's1',
        topicName: 'Sliding Window',
        activity: 'Problem Solving',
        durationSeconds: 3000,
        startedAt: '2026-10-01T10:00:00.000Z',
        endedAt: '2026-10-01T10:50:00.000Z',
      },
    ];

    const mockContests: UpcomingContest[] = [
      {
        id: 'c1',
        platform: 'leetcode',
        platformName: 'LeetCode',
        name: 'Weekly Contest 418',
        startTime: '2026-10-04T02:30:00.000Z',
        durationSeconds: 5400,
        url: 'https://leetcode.com',
      },
    ];

    const mockGoals: StudyGoal[] = [
      {
        id: 'g1',
        title: 'Complete 50 Contests',
        description: '',
        horizon: 'MONTHLY',
        type: 'CONTESTS',
        targetValue: 50,
        unit: 'contests',
        autoTrack: true,
        deadline: '2026-10-15',
        isCompleted: false,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const baseDate = new Date('2026-10-01T00:00:00.000Z');
    const { events, eventsByDate, dateRange } = buildUnifiedCalendarEvents(
      mockQuestions,
      mockSessions,
      mockContests,
      mockGoals,
      baseDate,
      21 // 3 weeks
    );

    expect(dateRange.length).toBe(21);
    expect(events.length).toBeGreaterThan(0);

    // Verify SRS Revision Event
    const srsEvent = events.find((e) => e.type === 'SRS_REVISION');
    expect(srsEvent).toBeDefined();
    expect(srsEvent?.color).toBe(ACTIVITY_COLORS.SRS_REVISION);
    expect(srsEvent?.dateStr).toBe('2026-10-01');

    // Verify Study Session Event
    const sessionEvent = events.find((e) => e.type === 'STUDY_SESSION');
    expect(sessionEvent).toBeDefined();
    expect(sessionEvent?.color).toBe(ACTIVITY_COLORS.STUDY_SESSION);
    expect(sessionEvent?.dateStr).toBe('2026-10-01');

    // Verify Saturday Mock & Sunday Special Cadences
    const mockEvent = events.find((e) => e.type === 'WEEKLY_MOCK');
    expect(mockEvent).toBeDefined();
    expect(mockEvent?.color).toBe(ACTIVITY_COLORS.WEEKLY_MOCK);

    const sundayEvent = events.find((e) => e.type === 'SUNDAY_SPECIAL');
    expect(sundayEvent).toBeDefined();
    expect(sundayEvent?.color).toBe(ACTIVITY_COLORS.SUNDAY_SPECIAL);

    // Verify Contest Event
    const contestEvent = events.find((e) => e.type === 'UPCOMING_CONTEST');
    expect(contestEvent).toBeDefined();
    expect(contestEvent?.color).toBe(ACTIVITY_COLORS.UPCOMING_CONTEST);

    // Verify Goal Deadline Event
    const goalEvent = events.find((e) => e.type === 'GOAL_DEADLINE');
    expect(goalEvent).toBeDefined();
    expect(goalEvent?.color).toBe(ACTIVITY_COLORS.GOAL_DEADLINE);
    expect(goalEvent?.dateStr).toBe('2026-10-15');

    // Verify Date Indexing Map
    expect(eventsByDate.has('2026-10-01')).toBe(true);
    expect(eventsByDate.get('2026-10-01')?.length).toBeGreaterThanOrEqual(2);
  });
});
