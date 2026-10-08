import { describe, it, expect } from 'vitest';
import { formatTopicDateHeading, groupTopicProblemsByDate } from './topicService';
import type { Problem } from '../types';

describe('Topic Problem Chronological Grouping & Formatting', () => {
  it('formats dates as standard uppercase headings', () => {
    expect(formatTopicDateHeading('2026-10-06')).toBe('06 OCTOBER 2026');
    expect(formatTopicDateHeading('2026-10-07')).toBe('07 OCTOBER 2026');
    expect(formatTopicDateHeading('2026-10-08')).toBe('08 OCTOBER 2026');
    expect(formatTopicDateHeading('2026-01-15')).toBe('15 JANUARY 2026');
    expect(formatTopicDateHeading('Unknown Date')).toBe('UNKNOWN DATE');
  });

  it('groups and sorts problems chronologically by solved date and within date by solved time', () => {
    const mockProblems: Problem[] = [
      {
        id: 'p3',
        topicId: 't1',
        title: 'Move Zeroes',
        difficulty: 'Easy',
        pattern: 'Two Pointer',
        solvedAt: '2026-10-07T06:30:00.000Z',
        createdAt: '2026-10-07T06:30:00.000Z',
        updatedAt: '2026-10-07T06:30:00.000Z',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        reviewHistory: [],
      },
      {
        id: 'p1',
        topicId: 't1',
        title: 'Two Sum',
        difficulty: 'Easy',
        pattern: 'Hashing',
        solvedAt: '2026-10-06T08:15:00.000Z',
        createdAt: '2026-10-06T08:15:00.000Z',
        updatedAt: '2026-10-06T08:15:00.000Z',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        reviewHistory: [],
      },
      {
        id: 'p5',
        topicId: 't1',
        title: 'Binary Subarrays With Sum',
        difficulty: 'Medium',
        pattern: 'Prefix Sum',
        solvedAt: '2026-10-08T11:20:00.000Z',
        createdAt: '2026-10-08T11:20:00.000Z',
        updatedAt: '2026-10-08T11:20:00.000Z',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        reviewHistory: [],
      },
      {
        id: 'p2',
        topicId: 't1',
        title: 'Maximum Subarray',
        difficulty: 'Medium',
        pattern: "Kadane's Algorithm",
        solvedAt: '2026-10-06T10:42:00.000Z',
        createdAt: '2026-10-06T10:42:00.000Z',
        updatedAt: '2026-10-06T10:42:00.000Z',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        reviewHistory: [],
      },
      {
        id: 'p4',
        topicId: 't1',
        title: 'Best Time to Buy and Sell Stock',
        difficulty: 'Easy',
        pattern: 'Greedy',
        solvedAt: '2026-10-07T09:00:00.000Z',
        createdAt: '2026-10-07T09:00:00.000Z',
        updatedAt: '2026-10-07T09:00:00.000Z',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        reviewHistory: [],
      },
    ];

    const groups = groupTopicProblemsByDate(mockProblems);

    // Should have 3 date groups
    expect(groups.length).toBe(3);

    // Group 1: 06 OCTOBER 2026
    expect(groups[0].displayDate).toBe('06 OCTOBER 2026');
    expect(groups[0].problems.length).toBe(2);
    expect(groups[0].problems[0].title).toBe('Two Sum'); // 08:15
    expect(groups[0].problems[1].title).toBe('Maximum Subarray'); // 10:42

    // Group 2: 07 OCTOBER 2026
    expect(groups[1].displayDate).toBe('07 OCTOBER 2026');
    expect(groups[1].problems.length).toBe(2);
    expect(groups[1].problems[0].title).toBe('Move Zeroes'); // 06:30
    expect(groups[1].problems[1].title).toBe('Best Time to Buy and Sell Stock'); // 09:00

    // Group 3: 08 OCTOBER 2026
    expect(groups[2].displayDate).toBe('08 OCTOBER 2026');
    expect(groups[2].problems.length).toBe(1);
    expect(groups[2].problems[0].title).toBe('Binary Subarrays With Sum'); // 11:20
  });

  it('handles empty problem array gracefully', () => {
    expect(groupTopicProblemsByDate([])).toEqual([]);
  });
});
