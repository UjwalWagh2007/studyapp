import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSyncVaultId,
  generateDeviceSecretKey,
  getDeviceSyncConfig,
  saveDeviceSyncConfig,
  mergeSyncPayloadData,
} from './syncService';
import type { SyncPayloadData, Problem, Topic, StudySession, MockTest, DailyTargetsConfig } from '../types';

describe('Multi-Device Sync Service', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('provides a valid default personal workspace identifier', () => {
    const vaultId = generateSyncVaultId();
    expect(vaultId).toBeDefined();
    expect(vaultId.length).toBeGreaterThan(5);
  });

  it('generates a 32-character secret key', () => {
    const key = generateDeviceSecretKey();
    expect(key.length).toBe(32);
  });

  it('initializes and saves device sync configuration with default enabled', () => {
    const config = getDeviceSyncConfig();
    expect(config.vaultId).toBeDefined();
    expect(config.isSyncEnabled).toBe(true);

    saveDeviceSyncConfig(config);

    const reloaded = getDeviceSyncConfig();
    expect(reloaded.vaultId).toBeDefined();
    expect(reloaded.isSyncEnabled).toBe(true);
  });


  describe('mergeSyncPayloadData', () => {
    const basePayload: SyncPayloadData = {
      topics: [],
      problems: [],
      studySessions: [],
      mockTests: [],
      version: 4,
      exportedAt: new Date().toISOString(),
    };

    it('merges new topics from remote device', () => {
      const localTopic: Topic = {
        id: 'top-1',
        name: 'Binary Search',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      };

      const remoteTopic: Topic = {
        id: 'top-2',
        name: 'Dynamic Programming',
        createdAt: '2026-10-01T11:00:00.000Z',
        updatedAt: '2026-10-01T11:00:00.000Z',
      };

      const local: SyncPayloadData = { ...basePayload, topics: [localTopic] };
      const remote: SyncPayloadData = { ...basePayload, topics: [remoteTopic] };

      const merged = mergeSyncPayloadData(local, remote);
      expect(merged.topics.length).toBe(2);
      expect(merged.topics.map((t) => t.id)).toContain('top-1');
      expect(merged.topics.map((t) => t.id)).toContain('top-2');
    });

    it('unions review histories when merging problems', () => {
      const pLaptop: Problem = {
        id: 'p-1',
        title: 'Two Sum',
        topicId: 'top-1',
        topicName: 'Two Pointers',
        difficulty: 'Easy',
        pattern: 'Two Pointers',
        solvedAt: '2026-10-01T09:00:00.000Z',
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        status: 'LEARNING',
        reviewCount: 1,
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewHistory: [
          {
            id: 'rev-laptop-1',
            problemId: 'p-1',
            reviewedAt: '2026-10-01T10:00:00.000Z',
            rating: 'GOOD',
            previousInterval: 0,
            newInterval: 1,
          },
        ],
      };

      const pPhone: Problem = {
        id: 'p-1',
        title: 'Two Sum',
        topicId: 'top-1',
        topicName: 'Two Pointers',
        difficulty: 'Easy',
        pattern: 'Two Pointers',
        solvedAt: '2026-10-01T09:00:00.000Z',
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-01T18:00:00.000Z',
        status: 'REVIEWING',
        reviewCount: 1,
        currentIntervalDays: 3,
        easeFactor: 2.5,
        reviewHistory: [
          {
            id: 'rev-phone-2',
            problemId: 'p-1',
            reviewedAt: '2026-10-01T18:00:00.000Z',
            rating: 'EASY',
            previousInterval: 1,
            newInterval: 3,
          },
        ],
      };

      const local: SyncPayloadData = { ...basePayload, problems: [pLaptop] };
      const remote: SyncPayloadData = { ...basePayload, problems: [pPhone] };

      const merged = mergeSyncPayloadData(local, remote);
      expect(merged.problems.length).toBe(1);
      const mergedP = merged.problems[0];

      expect(mergedP.reviewHistory.length).toBe(2);
      expect(mergedP.currentIntervalDays).toBe(3);
    });

    it('merges study sessions correctly across devices', () => {
      const session1: StudySession = {
        id: 'sess-laptop-1',
        name: 'DSA Trees',
        status: 'COMPLETED',
        dateStr: '2026-10-01',
        startTime: '2026-10-01T08:00:00.000Z',
        endTime: '2026-10-01T09:30:00.000Z',
        focusSeconds: 5400,
        breakSeconds: 600,
        lastStateChangeAt: '2026-10-01T09:30:00.000Z',
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T09:30:00.000Z',
      };

      const session2: StudySession = {
        id: 'sess-phone-1',
        name: 'Graphs Session',
        status: 'COMPLETED',
        dateStr: '2026-10-01',
        startTime: '2026-10-01T14:00:00.000Z',
        endTime: '2026-10-01T15:00:00.000Z',
        focusSeconds: 3600,
        breakSeconds: 0,
        lastStateChangeAt: '2026-10-01T15:00:00.000Z',
        createdAt: '2026-10-01T14:00:00.000Z',
        updatedAt: '2026-10-01T15:00:00.000Z',
      };

      const local: SyncPayloadData = { ...basePayload, studySessions: [session1] };
      const remote: SyncPayloadData = { ...basePayload, studySessions: [session2] };

      const merged = mergeSyncPayloadData(local, remote);
      expect(merged.studySessions?.length).toBe(2);
      expect(merged.studySessions?.map((s) => s.id)).toContain('sess-laptop-1');
      expect(merged.studySessions?.map((s) => s.id)).toContain('sess-phone-1');
    });

    it('merges mock tests correctly across devices', () => {
      const mockTest: MockTest = {
        id: 'mock-1',
        weekKey: '2026-W40',
        weekLabel: 'Week 40',
        testDay: 'SATURDAY',
        scheduledDate: '2026-10-03',
        status: 'COMPLETED',
        questions: [],
        currentQuestionIndex: 0,
        totalTimeSeconds: 3600,
        score: 8,
        maxScore: 10,
        percentage: 80,
        easyScore: 3,
        easyTotal: 3,
        mediumScore: 4,
        mediumTotal: 5,
        hardScore: 1,
        hardTotal: 2,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T11:00:00.000Z',
      };

      const local: SyncPayloadData = { ...basePayload, mockTests: [] };
      const remote: SyncPayloadData = { ...basePayload, mockTests: [mockTest] };

      const merged = mergeSyncPayloadData(local, remote);
      expect(merged.mockTests?.length).toBe(1);
      expect(merged.mockTests?.[0].score).toBe(8);
    });

    it('merges updated daily targets from remote device', () => {
      const localTargets: DailyTargetsConfig = {
        problemsTarget: 2,
        revisionsTarget: 5,
        studyMinutesTarget: 60,
      };

      const remoteTargets: DailyTargetsConfig = {
        problemsTarget: 4,
        revisionsTarget: 10,
        studyMinutesTarget: 120,
      };

      const local: SyncPayloadData = { ...basePayload, dailyTargets: localTargets };
      const remote: SyncPayloadData = { ...basePayload, dailyTargets: remoteTargets };

      const merged = mergeSyncPayloadData(local, remote);
      expect(merged.dailyTargets?.studyMinutesTarget).toBe(120);
      expect(merged.dailyTargets?.problemsTarget).toBe(4);
    });

    it('respects deletion tombstones when merging', () => {
      const topic1: Topic = {
        id: 'top-to-delete',
        name: 'Deleted Topic',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      };

      const topic2: Topic = {
        id: 'top-kept',
        name: 'Kept Topic',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      };

      const local: SyncPayloadData = {
        ...basePayload,
        topics: [topic2],
        deletedIds: ['top-to-delete'],
      };

      const remote: SyncPayloadData = {
        ...basePayload,
        topics: [topic1, topic2],
        deletedIds: [],
      };

      const merged = mergeSyncPayloadData(local, remote);
      expect(merged.topics.length).toBe(1);
      expect(merged.topics[0].id).toBe('top-kept');
      expect(merged.deletedIds).toContain('top-to-delete');
    });
  });
});




