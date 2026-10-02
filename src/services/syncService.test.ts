import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSyncVaultId,
  generateDeviceSecretKey,
  getDeviceSyncConfig,
  saveDeviceSyncConfig,
  mergeSyncPayloadData,
} from './syncService';
import type { SyncPayloadData, Problem, Topic } from '../types';

describe('Multi-Device Sync Service', () => {
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

  describe('mergeSyncPayloadData', () => {
    const basePayload: SyncPayloadData = {
      topics: [],
      problems: [],
      version: 1,
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
    });
  });
});
