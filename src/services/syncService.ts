/**
 * MULTI-DEVICE SYNC & CONFLICT-SAFE MERGE ENGINE
 * Personal Workspace Cross-Device Persistence (Topics, Problems, Sessions, Mock Tests, Targets)
 */

import type {
  DeviceSyncConfig,
  SyncEnvelope,
  SyncPayloadData,
  Topic,
  Problem,
  StudySession,
  MockTest,
} from '../types';
import { StorageService } from './storage';
import { dbSetSingleton } from './db';

const SYNC_CONFIG_KEY = 'studyos_sync_config_v4';

export function generateSyncVaultId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `STUDY-${p1}-${p2}`;
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

// URL Workspace ID Auto-detection
export function extractUrlWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get('ws') || searchParams.get('vault') || searchParams.get('pair');
    if (fromSearch) return fromSearch.trim();

    if (window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      const fromHash = hashParams.get('ws') || hashParams.get('vault') || hashParams.get('pair');
      if (fromHash) return fromHash.trim();
    }
  } catch {}
  return null;
}

export function getPairingUrl(vaultId: string): string {
  if (typeof window === 'undefined') return `?ws=${vaultId}`;
  const origin = window.location.origin;
  return `${origin}/?ws=${encodeURIComponent(vaultId)}`;
}

let memorySyncConfig: DeviceSyncConfig | null = null;

export function getDeviceSyncConfig(): DeviceSyncConfig {
  const urlWorkspace = extractUrlWorkspaceId();

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SYNC_CONFIG_KEY);
      if (raw) {
        const parsed: DeviceSyncConfig = JSON.parse(raw);
        // If user navigated via a pair link with a different workspace ID, switch to it
        if (urlWorkspace && urlWorkspace !== parsed.vaultId) {
          parsed.vaultId = urlWorkspace;
          parsed.isSyncEnabled = true;
          saveDeviceSyncConfig(parsed);
        }
        return parsed;
      }
    } else if (memorySyncConfig) {
      return memorySyncConfig;
    }
  } catch (err) {
    console.warn('Failed to read sync config from localStorage', err);
  }

  const initialConfig: DeviceSyncConfig = {
    vaultId: urlWorkspace || generateSyncVaultId(),
    secretKey: generateDeviceSecretKey(),
    deviceName: getClientDeviceName(),
    isSyncEnabled: true, // Enabled by default for seamless personal workspace experience
    autoSyncIntervalSeconds: 20,
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

// --------------------------------------------------------------------------
// Conflict-Safe Merge Helpers
// --------------------------------------------------------------------------
export function mergeEntitiesByTimestamp<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  local: T[] = [],
  remote: T[] = []
): T[] {
  const map = new Map<string, T>();

  local.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });

  remote.forEach((remoteItem) => {
    if (!remoteItem?.id) return;
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

export function mergeProblems(local: Problem[] = [], remote: Problem[] = []): Problem[] {
  const map = new Map<string, Problem>();

  local.forEach((p) => {
    if (p?.id) map.set(p.id, p);
  });

  remote.forEach((remoteP) => {
    if (!remoteP?.id) return;
    const localP = map.get(remoteP.id);
    if (!localP) {
      map.set(remoteP.id, remoteP);
    } else {
      const localTime = new Date(localP.updatedAt || localP.createdAt || 0).getTime();
      const remoteTime = new Date(remoteP.updatedAt || remoteP.createdAt || 0).getTime();

      // Union review histories
      const reviewLogsMap = new Map<string, Problem['reviewHistory'][number]>();
      (localP.reviewHistory || []).forEach((r) => {
        const key = r.reviewedAt || r.id;
        if (key) reviewLogsMap.set(key, r);
      });
      (remoteP.reviewHistory || []).forEach((r) => {
        const key = r.reviewedAt || r.id;
        if (key) reviewLogsMap.set(key, r);
      });

      const mergedReviewHistory = Array.from(reviewLogsMap.values()).sort(
        (a, b) => new Date(a.reviewedAt || 0).getTime() - new Date(b.reviewedAt || 0).getTime()
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
    studySessions: mergeEntitiesByTimestamp<StudySession>(local.studySessions || [], remote.studySessions || []),
    mockTests: mergeEntitiesByTimestamp<MockTest>(local.mockTests || [], remote.mockTests || []),
    dailyTargets: remote.dailyTargets || local.dailyTargets,
    version: Math.max(local.version || 1, remote.version || 1),
    exportedAt: new Date().toISOString(),
  };
}

export function captureCurrentSyncPayload(): SyncPayloadData {
  return {
    topics: StorageService.getTopics(),
    problems: StorageService.getProblems(),
    studySessions: StorageService.getStudySessions(),
    dailyTargets: StorageService.getDailyTargets(),
    mockTests: StorageService.getMockTests(),
    version: 4,
    exportedAt: new Date().toISOString(),
  };
}

export function applyMergedSyncPayload(merged: SyncPayloadData): void {
  if (merged.topics) StorageService.saveTopics(merged.topics);
  if (merged.problems) StorageService.saveProblems(merged.problems);
  if (merged.studySessions) StorageService.saveStudySessions(merged.studySessions);
  if (merged.dailyTargets) StorageService.saveDailyTargets(merged.dailyTargets);
  if (merged.mockTests) StorageService.saveMockTests(merged.mockTests);
}

// --------------------------------------------------------------------------
// Cloud Synchronization Core Function
// --------------------------------------------------------------------------
export async function syncWithCloud(overrideVaultId?: string): Promise<{
  success: boolean;
  mergedData?: SyncPayloadData;
  error?: string;
}> {
  const config = getDeviceSyncConfig();
  const activeVaultId = overrideVaultId || config.vaultId;

  if (!config.isSyncEnabled && !overrideVaultId) {
    return { success: true };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    return { success: false, error: 'Device is offline. Changes saved locally.' };
  }

  const localPayload = captureCurrentSyncPayload();
  const envelope: SyncEnvelope = {
    vaultId: activeVaultId,
    deviceId: config.secretKey.slice(0, 8),
    timestamp: new Date().toISOString(),
    data: localPayload,
  };

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-vault': activeVaultId,
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
      if (overrideVaultId) {
        config.vaultId = overrideVaultId;
        config.isSyncEnabled = true;
      }
      saveDeviceSyncConfig(config);

      return { success: true, mergedData: merged };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[SyncService] Cloud sync notice:', err.message);
    return { success: false, error: err.message };
  }
}

export async function fetchRemoteWorkspace(vaultId: string): Promise<{
  success: boolean;
  mergedData?: SyncPayloadData;
  error?: string;
}> {
  return syncWithCloud(vaultId);
}
