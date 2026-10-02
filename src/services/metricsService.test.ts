import { describe, it, expect } from 'vitest';
import { computeTodayMetrics, computeConsistencyHeatmap } from './metricsService';
import type { Problem, StudySession, DailyTargetsConfig } from '../types';

describe('Metrics & Consistency Service', () => {
  const customTargets: DailyTargetsConfig = {
    problemsTarget: 2,
    revisionsTarget: 2,
    studyMinutesTarget: 60, // 1 hour (3600 seconds)
  };

  it('accurately computes today targets progress when nothing is done', () => {
    const metrics = computeTodayMetrics([], [], customTargets, '2026-10-02');

    expect(metrics.problemsSolved).toBe(0);
    expect(metrics.revisionsDone).toBe(0);
    expect(metrics.studySeconds).toBe(0);
    expect(metrics.problemsPercentage).toBe(0);
    expect(metrics.revisionsPercentage).toBe(0);
    expect(metrics.studyPercentage).toBe(0);
    expect(metrics.allCompleted).toBe(false);
  });

  it('accurately detects partial and 100% target completions', () => {
    const mockProblems: Problem[] = [
      {
        id: 'p1',
        topicId: 't1',
        title: 'Problem 1',
        difficulty: 'Easy',
        solvedAt: '2026-10-02T10:00:00.000Z',
        createdAt: '',
        updatedAt: '',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 1,
        reviewHistory: [
          {
            id: 'r1',
            problemId: 'p1',
            reviewedAt: '2026-10-02T10:30:00.000Z',
            rating: 'GOOD',
            previousInterval: 1,
            newInterval: 3,
          },
        ],
      },
      {
        id: 'p2',
        topicId: 't1',
        title: 'Problem 2',
        difficulty: 'Medium',
        solvedAt: '2026-10-02T11:00:00.000Z',
        createdAt: '',
        updatedAt: '',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 1,
        reviewHistory: [
          {
            id: 'r2',
            problemId: 'p2',
            reviewedAt: '2026-10-02T11:30:00.000Z',
            rating: 'GOOD',
            previousInterval: 1,
            newInterval: 3,
          },
        ],
      },
    ];

    const mockSessions: StudySession[] = [
      {
        id: 's1',
        dateStr: '2026-10-02',
        durationSeconds: 3600, // 60 mins -> 100%
        startedAt: '2026-10-02T10:00:00.000Z',
      },
    ];

    const metrics = computeTodayMetrics(mockProblems, mockSessions, customTargets, '2026-10-02');

    expect(metrics.problemsSolved).toBe(2);
    expect(metrics.problemsCompleted).toBe(true);
    expect(metrics.revisionsDone).toBe(2);
    expect(metrics.revisionsCompleted).toBe(true);
    expect(metrics.studySeconds).toBe(3600);
    expect(metrics.studyCompleted).toBe(true);
    expect(metrics.allCompleted).toBe(true);
  });

  it('assigns darkest green intensity (5) only to days with completed targets', () => {
    const mockProblems: Problem[] = [
      {
        id: 'p1',
        topicId: 't1',
        title: 'Problem 1',
        difficulty: 'Easy',
        solvedAt: '2026-10-02T10:00:00.000Z',
        createdAt: '',
        updatedAt: '',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 2,
        reviewHistory: [
          {
            id: 'r1',
            problemId: 'p1',
            reviewedAt: '2026-10-02T10:30:00.000Z',
            rating: 'GOOD',
            previousInterval: 1,
            newInterval: 3,
          },
          {
            id: 'r2',
            problemId: 'p1',
            reviewedAt: '2026-10-02T11:00:00.000Z',
            rating: 'GOOD',
            previousInterval: 3,
            newInterval: 7,
          },
        ],
      },
      {
        id: 'p2',
        topicId: 't1',
        title: 'Problem 2',
        difficulty: 'Medium',
        solvedAt: '2026-10-02T11:00:00.000Z',
        createdAt: '',
        updatedAt: '',
        status: 'LEARNING',
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        reviewHistory: [],
      },
    ];

    const mockSessions: StudySession[] = [
      {
        id: 's1',
        dateStr: '2026-10-02',
        durationSeconds: 3600,
        startedAt: '2026-10-02T10:00:00.000Z',
      },
    ];

    const baseDate = new Date('2026-10-02T00:00:00.000Z');
    const heatmap = computeConsistencyHeatmap(mockProblems, mockSessions, customTargets, 52, baseDate);

    expect(heatmap.length).toBe(52 * 7);

    const todayCell = heatmap.find((d) => d.dateStr === '2026-10-02');
    expect(todayCell).toBeDefined();
    expect(todayCell?.isFullyCompleted).toBe(true);
    expect(todayCell?.intensity).toBe(5); // Darkest green
  });
});
