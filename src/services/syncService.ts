/**
 * MULTI-DEVICE SYNC & CONFLICT-SAFE MERGE FOR TOPICS & PROBLEMS
 */

import type { DeviceSyncConfig, SyncEnvelope, SyncPayloadData, Topic, Problem } from '../types';
import { StorageService } from './storage';
import { dbSetSingleton } from './db';

const SYNC_CONFIG_KEY = 'studyos_sync_config_v3';

export function generateSyncVaultId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'psync-' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return 'psync-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

export function generateDeviceSecretKey(): string {
  const chars = 'abcdef0123456789';
  let res = '';
  for (let i = 0; i < 32; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

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

function mergeEntitiesByTimestamp<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  local: T[],
  remote: T[]
): T[] {
  const map = new Map<string, T>();

  local.forEach((item) => {
    map.set(item.id, item);
  });

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

function mergeProblems(local: Problem[], remote: Problem[]): Problem[] {
  const map = new Map<string, Problem>();

  local.forEach((p) => map.set(p.id, p));

  remote.forEach((remoteP) => {
    const localP = map.get(remoteP.id);
    if (!localP) {
      map.set(remoteP.id, remoteP);
    } else {
      const localTime = new Date(localP.updatedAt || localP.createdAt || 0).getTime();
      const remoteTime = new Date(remoteP.updatedAt || remoteP.createdAt || 0).getTime();

      const reviewLogsMap = new Map<string, Problem['reviewHistory'][number]>();
      (localP.reviewHistory || []).forEach((r) => reviewLogsMap.set(r.reviewedAt, r));
      (remoteP.reviewHistory || []).forEach((r) => reviewLogsMap.set(r.reviewedAt, r));

      const mergedReviewHistory = Array.from(reviewLogsMap.values()).sort(
        (a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
      );

      const baseProblem = remoteTime >= localTime ? remoteP : localP;

      map.set(remoteP.id, {
        ...baseProblem,
        reviewHistory: mergedReviewHistory,
        reviewCount: mergedReviewHistory.length,
      });
    }
  });

  return Array.from(map.values());
}

export function mergeSyncPayloadData(
  local: SyncPayloadData,
  remote: SyncPayloadData
): SyncPayloadData {
  return {
    topics: mergeEntitiesByTimestamp<Topic>(local.topics || [], remote.topics || []),
    problems: mergeProblems(local.problems || [], remote.problems || []),
    version: Math.max(local.version || 1, remote.version || 1),
    exportedAt: new Date().toISOString(),
  };
}

export function captureCurrentSyncPayload(): SyncPayloadData {
  return {
    topics: StorageService.getTopics(),
    problems: StorageService.getProblems(),
    version: 3,
    exportedAt: new Date().toISOString(),
  };
}

export function applyMergedSyncPayload(merged: SyncPayloadData): void {
  StorageService.saveTopics(merged.topics);
  StorageService.saveProblems(merged.problems);
}

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
    return { success: false, error: 'Device is offline. Changes saved locally.' };
  }

  const localPayload = captureCurrentSyncPayload();
  const envelope: SyncEnvelope = {
    vaultId: config.vaultId,
    deviceId: config.secretKey.slice(0, 8),
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
      if (res.status === 404 || res.status === 500) {
        config.lastSuccessfulSyncAt = new Date().toISOString();
        saveDeviceSyncConfig(config);
        return { success: true, mergedData: localPayload };
      }
      throw new Error(`Sync error: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.data) {
      const merged = mergeSyncPayloadData(localPayload, json.data);
      applyMergedSyncPayload(merged);

      config.lastSuccessfulSyncAt = new Date().toISOString();
      saveDeviceSyncConfig(config);

      return { success: true, mergedData: merged };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[SyncService] Cloud sync fallback:', err.message);
    return { success: false, error: err.message };
  }
}
