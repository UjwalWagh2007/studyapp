import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSyncVaultId,
  generateDeviceSecretKey,
  getDeviceSyncConfig,
  saveDeviceSyncConfig,
  mergeSyncPayloadData,
} from './syncService';
import type { SyncPayloadData, Question, Topic } from '../types';

describe('Multi-Device Sync & Conflict-Safe Merging Service', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('generates a valid private Sync Vault ID', () => {
    const vaultId = generateSyncVaultId();
    expect(vaultId).toMatch(/^psync-[a-f0-9]{16}$/i);
  });

  it('generates a 32-character secret key', () => {
    const key = generateDeviceSecretKey();
    expect(key.length).toBe(32);
  });

  it('initializes and saves device sync configuration', () => {
    const config = getDeviceSyncConfig();
    expect(config.vaultId).toBeDefined();
    expect(config.isSyncEnabled).toBe(false);

    config.isSyncEnabled = true;
    config.vaultId = 'psync-test-vault-123';
    saveDeviceSyncConfig(config);

    const reloaded = getDeviceSyncConfig();
    expect(reloaded.vaultId).toBe('psync-test-vault-123');
    expect(reloaded.isSyncEnabled).toBe(true);
  });

  describe('mergeSyncPayloadData (LWW & Review History Union)', () => {
    const basePayload: SyncPayloadData = {
      topics: [],
      questions: [],
      mistakes: [],
      insights: [],
      mockTests: [],
      goals: [],
      dailyTargets: { newQuestionsTarget: 3, revisionsTarget: 10, studyTimeTargetMinutes: 90 },
      studySessions: [],
      platformAccounts: [],
      contestRecords: [],
      contestJournal: [],
      notificationPreferences: {
        enabled: true,
        preferredTime: 'MORNING',
        categories: { srsRevisions: true, weeklyMock: true, sundaySpecial: true, contests: true, goals: true, streaks: true },
      },
      settings: {
        userName: 'Ujwal',
        email: 'ujwal@example.com',
        theme: 'dark',
        sidebarCollapsed: false,
        compactMode: false,
      },
    };

    it('merges new topics from remote device', () => {
      const localTopic: Topic = {
        id: 'top-1',
        name: 'Binary Search',
        subject: 'DSA',
        color: '#f59e0b',
        isArchived: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      };

      const remoteTopic: Topic = {
        id: 'top-2',
        name: 'Dynamic Programming',
        subject: 'DSA',
        color: '#a855f7',
        isArchived: false,
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

    it('applies Last-Write-Wins when both devices edit the same topic', () => {
      const olderTopic: Topic = {
        id: 'top-1',
        name: 'Sliding Window Old',
        subject: 'DSA',
        color: '#38bdf8',
        isArchived: false,
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
      };

      const newerTopic: Topic = {
        id: 'top-1',
        name: 'Sliding Window Updated on Phone',
        subject: 'DSA',
        color: '#38bdf8',
        isArchived: false,
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
      };

      const local: SyncPayloadData = { ...basePayload, topics: [olderTopic] };
      const remote: SyncPayloadData = { ...basePayload, topics: [newerTopic] };

      const merged = mergeSyncPayloadData(local, remote);
      expect(merged.topics.length).toBe(1);
      expect(merged.topics[0].name).toBe('Sliding Window Updated on Phone');
    });

    it('unions SRS review histories without dropping reviews completed on separate devices', () => {
      const qLaptop: Question = {
        id: 'q-1',
        title: 'Two Sum',
        subject: 'DSA',
        topicId: 'top-1',
        topicName: 'Two Pointers',
        difficulty: 'Easy',
        pattern: 'Two Pointers',
        source: 'LeetCode',
        tags: [],
        notes: '',
        status: 'LEARNING',
        mastery: 2,
        isArchived: false,
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        reviewCount: 1,
        successfulReviews: 1,
        failedReviews: 0,
        consecutiveSuccesses: 1,
        currentIntervalDays: 1,
        easeFactor: 2.5,
        reviewHistory: [
          {
            id: 'rev-laptop-1',
            questionId: 'q-1',
            reviewedAt: '2026-10-01T10:00:00.000Z',
            rating: 'GOOD',
            previousInterval: 0,
            newInterval: 1,
            previousEaseFactor: 2.5,
            newEaseFactor: 2.5,
            previousMastery: 0,
            newMastery: 1,
          },
        ],
      };

      const qPhone: Question = {
        id: 'q-1',
        title: 'Two Sum',
        subject: 'DSA',
        topicId: 'top-1',
        topicName: 'Two Pointers',
        difficulty: 'Easy',
        pattern: 'Two Pointers',
        source: 'LeetCode',
        tags: [],
        notes: '',
        status: 'REVIEWING',
        mastery: 3,
        isArchived: false,
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-01T18:00:00.000Z',
        reviewCount: 1,
        successfulReviews: 1,
        failedReviews: 0,
        consecutiveSuccesses: 2,
        currentIntervalDays: 3,
        easeFactor: 2.5,
        reviewHistory: [
          {
            id: 'rev-phone-2',
            questionId: 'q-1',
            reviewedAt: '2026-10-01T18:00:00.000Z',
            rating: 'EASY',
            previousInterval: 1,
            newInterval: 3,
            previousEaseFactor: 2.5,
            newEaseFactor: 2.6,
            previousMastery: 1,
            newMastery: 2,
          },
        ],
      };

      const local: SyncPayloadData = { ...basePayload, questions: [qLaptop] };
      const remote: SyncPayloadData = { ...basePayload, questions: [qPhone] };

      const merged = mergeSyncPayloadData(local, remote);
      expect(merged.questions.length).toBe(1);
      const mergedQ = merged.questions[0];

      // Both review histories merged
      expect(mergedQ.reviewHistory.length).toBe(2);
      expect(mergedQ.status).toBe('REVIEWING');
    });
  });
});
