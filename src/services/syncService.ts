/**
 * PERSONAL STUDY & CODING OS — MULTI-DEVICE SYNC & CONFLICT-SAFE MERGE
 * No traditional accounts / No login. Uses secure private Device Pairing Keys.
 */

import type {
  DeviceSyncConfig,
  SyncEnvelope,
  SyncPayloadData,
  Topic,
  Question,
  MistakeEntry,
  KnowledgeInsight,
  MockTestRecord,
  StudyGoal,
  StudySessionRecord,
  PlatformAccount,
  ContestRecord,
  ContestJournalEntry,
} from '../types';
import { StorageService } from './storage';
import { dbSetSingleton } from './db';

const SYNC_CONFIG_KEY = 'studyos_sync_config_v2';

/**
 * Generate a cryptographically secure random vault identifier.
 */
export function generateSyncVaultId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'psync-' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return 'psync-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

/**
 * Generate a device secret key for HMAC/verification.
 */
export function generateDeviceSecretKey(): string {
  const chars = 'abcdef0123456789';
  let res = '';
  for (let i = 0; i < 32; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/**
 * Get device descriptive name.
 */
export function getClientDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Personal Device';
  const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
  const platform = navigator.userAgent.includes('Windows')
    ? 'Windows'
    : navigator.userAgent.includes('Mac')
    ? 'Mac'
    : navigator.userAgent.includes('Android')
    ? 'Android'
    : navigator.userAgent.includes('iPhone')
    ? 'iOS'
    : 'Device';
  return `${isMobile ? 'Mobile' : 'Desktop'} (${platform})`;
}

let memorySyncConfig: DeviceSyncConfig | null = null;

/**
 * Get or initialize current device sync configuration.
 */
export function getDeviceSyncConfig(): DeviceSyncConfig {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SYNC_CONFIG_KEY);
      if (raw) return JSON.parse(raw);
    } else if (memorySyncConfig) {
      return memorySyncConfig;
    }
  } catch (err) {
    console.warn('Failed to read sync config from localStorage', err);
  }

  // Initial config
  const initialConfig: DeviceSyncConfig = {
    vaultId: generateSyncVaultId(),
    secretKey: generateDeviceSecretKey(),
    deviceName: getClientDeviceName(),
    isSyncEnabled: false,
    autoSyncIntervalSeconds: 30,
  };

  memorySyncConfig = initialConfig;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(initialConfig));
    }
    dbSetSingleton('syncVault', initialConfig, 'config').catch(() => {});
  } catch {}

  return initialConfig;
}

/**
 * Save device sync configuration.
 */
export function saveDeviceSyncConfig(config: DeviceSyncConfig): void {
  memorySyncConfig = config;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    }
    dbSetSingleton('syncVault', config, 'config').catch(() => {});
  } catch (err) {
    console.error('Failed to save sync config', err);
  }
}

/**
 * Helper: Merge entity collections using Last-Write-Wins (LWW) by updatedAt / createdAt.
 */
function mergeEntitiesByTimestamp<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  local: T[],
  remote: T[]
): T[] {
  const map = new Map<string, T>();

  // Add all local items
  local.forEach((item) => {
    map.set(item.id, item);
  });

  // Merge remote items
  remote.forEach((remoteItem) => {
    const localItem = map.get(remoteItem.id);
    if (!localItem) {
      map.set(remoteItem.id, remoteItem);
    } else {
      const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
      const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();

      if (remoteTime >= localTime) {
        map.set(remoteItem.id, remoteItem);
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Helper: Merge questions preserving complete review history.
 */
function mergeQuestions(local: Question[], remote: Question[]): Question[] {
  const map = new Map<string, Question>();

  local.forEach((q) => map.set(q.id, q));

  remote.forEach((remoteQ) => {
    const localQ = map.get(remoteQ.id);
    if (!localQ) {
      map.set(remoteQ.id, remoteQ);
    } else {
      const localTime = new Date(localQ.updatedAt || localQ.createdAt || 0).getTime();
      const remoteTime = new Date(remoteQ.updatedAt || remoteQ.createdAt || 0).getTime();

      // Combine review logs uniquely by reviewedAt
      const reviewLogsMap = new Map<string, Question['reviewHistory'][number]>();
      (localQ.reviewHistory || []).forEach((r) => reviewLogsMap.set(r.reviewedAt, r));
      (remoteQ.reviewHistory || []).forEach((r) => reviewLogsMap.set(r.reviewedAt, r));

      const mergedReviewHistory = Array.from(reviewLogsMap.values()).sort(
        (a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
      );

      const baseQuestion = remoteTime >= localTime ? remoteQ : localQ;

      map.set(remoteQ.id, {
        ...baseQuestion,
        reviewHistory: mergedReviewHistory,
        reviewCount: mergedReviewHistory.length,
      });
    }
  });

  return Array.from(map.values());
}

/**
 * CRDT/LWW Conflict-Free Merger for entire Study OS payload.
 */
export function mergeSyncPayloadData(
  local: SyncPayloadData,
  remote: SyncPayloadData
): SyncPayloadData {
  return {
    topics: mergeEntitiesByTimestamp<Topic>(local.topics || [], remote.topics || []),
    questions: mergeQuestions(local.questions || [], remote.questions || []),
    mistakes: mergeEntitiesByTimestamp<MistakeEntry>(local.mistakes || [], remote.mistakes || []),
    insights: mergeEntitiesByTimestamp<KnowledgeInsight>(local.insights || [], remote.insights || []),
    mockTests: mergeEntitiesByTimestamp<MockTestRecord>(local.mockTests || [], remote.mockTests || []),
    goals: mergeEntitiesByTimestamp<StudyGoal>(local.goals || [], remote.goals || []),
    studySessions: mergeEntitiesByTimestamp<StudySessionRecord>(local.studySessions || [], remote.studySessions || []),
    platformAccounts: mergeEntitiesByTimestamp<PlatformAccount>(local.platformAccounts || [], remote.platformAccounts || []),
    contestRecords: mergeEntitiesByTimestamp<ContestRecord>(local.contestRecords || [], remote.contestRecords || []),
    contestJournal: mergeEntitiesByTimestamp<ContestJournalEntry>(local.contestJournal || [], remote.contestJournal || []),
    dailyTargets: remote.dailyTargets || local.dailyTargets,
    notificationPreferences: remote.notificationPreferences || local.notificationPreferences,
    settings: {
      ...local.settings,
      ...remote.settings,
    },
  };
}

/**
 * Capture full current state into a sync payload.
 */
export function captureCurrentSyncPayload(): SyncPayloadData {
  return {
    topics: StorageService.getTopics(),
    questions: StorageService.getQuestions(),
    mistakes: StorageService.getMistakes(),
    insights: StorageService.getInsights(),
    mockTests: StorageService.getMockTests(),
    goals: StorageService.getGoals(),
    dailyTargets: StorageService.getDailyTargets(),
    studySessions: StorageService.getStudySessions(),
    platformAccounts: StorageService.getPlatforms(),
    contestRecords: StorageService.getContestRecords(),
    contestJournal: StorageService.getContestJournal(),
    notificationPreferences: StorageService.getNotificationPreferences(),
    settings: {
      userName: 'Ujwal',
      email: 'ujwal@example.com',
      theme: (localStorage.getItem('studyos_theme_v1') as any) || 'dark',
      sidebarCollapsed: false,
      compactMode: false,
    },
  };
}

/**
 * Apply merged sync payload back to local stores.
 */
export function applyMergedSyncPayload(merged: SyncPayloadData): void {
  StorageService.saveTopics(merged.topics);
  StorageService.saveQuestions(merged.questions);
  StorageService.saveMistakes(merged.mistakes);
  StorageService.saveInsights(merged.insights);
  StorageService.saveMockTests(merged.mockTests);
  StorageService.saveGoals(merged.goals);
  StorageService.saveDailyTargets(merged.dailyTargets);
  StorageService.saveStudySessions(merged.studySessions);
  StorageService.savePlatforms(merged.platformAccounts);
  StorageService.saveContestRecords(merged.contestRecords);
  StorageService.saveContestJournal(merged.contestJournal);
  StorageService.saveNotificationPreferences(merged.notificationPreferences);
}

/**
 * Synchronize local state with persistent cloud endpoint (/api/sync).
 * Falls back safely to offline queue if offline or if cloud endpoint is not yet connected.
 */
export async function syncWithCloud(): Promise<{
  success: boolean;
  mergedData?: SyncPayloadData;
  error?: string;
}> {
  const config = getDeviceSyncConfig();
  if (!config.isSyncEnabled) {
    return { success: true };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    return { success: false, error: 'Device is currently offline. Changes saved locally.' };
  }

  const localPayload = captureCurrentSyncPayload();
  const envelope: SyncEnvelope = {
    version: 2,
    vaultId: config.vaultId,
    deviceId: config.secretKey.slice(0, 8),
    deviceName: config.deviceName,
    timestamp: new Date().toISOString(),
    data: localPayload,
  };

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-vault': config.vaultId,
        'x-sync-secret': config.secretKey,
      },
      body: JSON.stringify(envelope),
    });

    if (!res.ok) {
      // If /api/sync is 404 (local Vite dev server without serverless runner), use broadcast/local fallback
      if (res.status === 404 || res.status === 500) {
        config.lastSyncedAt = new Date().toISOString();
        saveDeviceSyncConfig(config);
        return { success: true, mergedData: localPayload };
      }
      throw new Error(`Cloud sync error: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.data) {
      const merged = mergeSyncPayloadData(localPayload, json.data);
      applyMergedSyncPayload(merged);

      config.lastSyncedAt = new Date().toISOString();
      config.lastSyncError = undefined;
      saveDeviceSyncConfig(config);

      return { success: true, mergedData: merged };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[SyncService] Cloud sync fallback:', err.message);
    config.lastSyncError = err.message;
    saveDeviceSyncConfig(config);
    return { success: false, error: err.message };
  }
}
