import { describe, it, expect } from 'vitest';
import { buildCalendarDays } from './calendarService';
import type { Problem } from '../types';

describe('Calendar Service', () => {
  it('builds calendar days with scheduled problems correctly', () => {
    const mockProblems: Problem[] = [
      {
        id: 'p1',
        topicId: 't1',
        topicName: 'Arrays',
        title: 'Two Sum',
        difficulty: 'Easy',
        pattern: 'Hash Map',
        solvedAt: '2026-10-01T10:00:00.000Z',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        nextReviewAt: '2026-10-02',
        reviewHistory: [],
      },
    ];

    const baseDate = new Date('2026-10-02T00:00:00.000Z');
    const days = buildCalendarDays(mockProblems, baseDate, 35);

    expect(days.length).toBe(35);

    // Today (2026-10-02) should have 1 scheduled problem
    const today = days.find((d) => d.dateStr === '2026-10-02');
    expect(today).toBeDefined();
    expect(today?.isToday).toBe(true);
    expect(today?.scheduledProblems.length).toBe(1);
    expect(today?.scheduledProblems[0].title).toBe('Two Sum');

    // Tomorrow (2026-10-03) should have 0 scheduled problems
    const tomorrow = days.find((d) => d.dateStr === '2026-10-03');
    expect(tomorrow).toBeDefined();
    expect(tomorrow?.scheduledProblems.length).toBe(0);
  });
});
