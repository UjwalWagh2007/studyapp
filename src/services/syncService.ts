/**
 * MULTI-DEVICE SYNC & CONFLICT-SAFE MERGE ENGINE
 * Universal Zero-Config Cross-Device Persistence (Topics, Problems, Sessions, Mock Tests, Targets)
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

// Master Shared Workspace ID (Zero-config across all devices and links)
export const DEFAULT_PERSONAL_WORKSPACE_ID = 'ws_ff808181a09d98f701a0ffdfab106797';

export function generateSyncVaultId(): string {
  return DEFAULT_PERSONAL_WORKSPACE_ID;
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

// URL Workspace ID Auto-detection (optional override)
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

export function getPairingUrl(_vaultId?: string): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

// --------------------------------------------------------------------------
// Cross-Tab Instant Sync (Same Browser)
// --------------------------------------------------------------------------
let crossTabChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    crossTabChannel = new BroadcastChannel('studyos_cross_tab_sync_v4');
  }
} catch {}

export function broadcastLocalChange(payload: SyncPayloadData): void {
  if (crossTabChannel) {
    try {
      crossTabChannel.postMessage({ type: 'WORKSPACE_SYNC', payload });
    } catch {}
  }
}

export function onBroadcastSync(callback: (payload: SyncPayloadData) => void): () => void {
  if (!crossTabChannel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'WORKSPACE_SYNC' && event.data?.payload) {
      callback(event.data.payload);
    }
  };
  crossTabChannel.addEventListener('message', handler);
  return () => {
    crossTabChannel?.removeEventListener('message', handler);
  };
}

let memorySyncConfig: DeviceSyncConfig | null = null;

export function getDeviceSyncConfig(): DeviceSyncConfig {
  const urlWorkspace = extractUrlWorkspaceId();

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SYNC_CONFIG_KEY);
      if (raw) {
        const parsed: DeviceSyncConfig = JSON.parse(raw);
        if (urlWorkspace && urlWorkspace !== parsed.vaultId) {
          parsed.vaultId = urlWorkspace;
          parsed.isSyncEnabled = true;
          saveDeviceSyncConfig(parsed);
        } else if (!urlWorkspace && parsed.vaultId !== DEFAULT_PERSONAL_WORKSPACE_ID) {
          parsed.vaultId = DEFAULT_PERSONAL_WORKSPACE_ID;
          parsed.isSyncEnabled = true;
          saveDeviceSyncConfig(parsed);
        }
        return parsed;
      }
    } else if (memorySyncConfig) {
      if (!urlWorkspace && memorySyncConfig.vaultId !== DEFAULT_PERSONAL_WORKSPACE_ID) {
        memorySyncConfig.vaultId = DEFAULT_PERSONAL_WORKSPACE_ID;
      }
      return memorySyncConfig;
    }
  } catch (err) {
    console.warn('Failed to read sync config from localStorage', err);
  }


  const initialConfig: DeviceSyncConfig = {
    vaultId: urlWorkspace || DEFAULT_PERSONAL_WORKSPACE_ID,
    secretKey: generateDeviceSecretKey(),
    deviceName: getClientDeviceName(),
    isSyncEnabled: true,
    autoSyncIntervalSeconds: 4,
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
// Conflict-Safe & Deletion-Aware Merge Helpers
// --------------------------------------------------------------------------
export function mergeEntitiesByTimestamp<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  local: T[] = [],
  remote: T[] = [],
  deletedSet: Set<string> = new Set()
): T[] {
  const map = new Map<string, T>();

  local.forEach((item) => {
    if (item?.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    }
  });

  remote.forEach((remoteItem) => {
    if (!remoteItem?.id || deletedSet.has(remoteItem.id)) return;
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

export function mergeProblems(
  local: Problem[] = [],
  remote: Problem[] = [],
  deletedSet: Set<string> = new Set()
): Problem[] {
  const map = new Map<string, Problem>();

  local.forEach((p) => {
    if (p?.id && !deletedSet.has(p.id)) {
      map.set(p.id, p);
    }
  });

  remote.forEach((remoteP) => {
    if (!remoteP?.id || deletedSet.has(remoteP.id)) return;
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
  const combinedDeleted = Array.from(
    new Set([...(local.deletedIds || []), ...(remote.deletedIds || [])])
  ).slice(0, 300);
  const deletedSet = new Set(combinedDeleted);

  return {
    topics: mergeEntitiesByTimestamp<Topic>(local.topics || [], remote.topics || [], deletedSet),
    problems: mergeProblems(local.problems || [], remote.problems || [], deletedSet),
    studySessions: mergeEntitiesByTimestamp<StudySession>(
      local.studySessions || [],
      remote.studySessions || [],
      deletedSet
    ),
    mockTests: mergeEntitiesByTimestamp<MockTest>(local.mockTests || [], remote.mockTests || [], deletedSet),
    dailyTargets: remote.dailyTargets || local.dailyTargets,
    deletedIds: combinedDeleted,
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
    deletedIds: StorageService.getDeletedIds(),
    version: 4,
    exportedAt: new Date().toISOString(),
  };
}

export function applyMergedSyncPayload(merged: SyncPayloadData): void {
  if (merged.deletedIds) StorageService.setDeletedIds(merged.deletedIds);
  if (merged.topics) StorageService.saveTopics(merged.topics);
  if (merged.problems) StorageService.saveProblems(merged.problems);
  if (merged.studySessions) StorageService.saveStudySessions(merged.studySessions);
  if (merged.dailyTargets) StorageService.saveDailyTargets(merged.dailyTargets);
  if (merged.mockTests) StorageService.saveMockTests(merged.mockTests);
}

const CLOUD_STORAGE_API = 'https://api.restful-api.dev/objects';

function cleanCloudId(vaultId: string): string {
  const cleaned = vaultId.replace(/^ws_/i, '').trim();
  return cleaned || 'ff808181a09d98f701a0ffdfab106797';
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
  const isLocalFreshOrEmpty =
    localPayload.topics.length === 0 &&
    localPayload.problems.length === 0 &&
    (localPayload.studySessions || []).length === 0 &&
    (localPayload.mockTests || []).length === 0;

  const envelope: SyncEnvelope = {
    vaultId: activeVaultId,
    deviceId: config.secretKey.slice(0, 8),
    timestamp: new Date().toISOString(),
    data: localPayload,
  };

  // 1. Try Vercel Serverless Function endpoint first
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-vault': activeVaultId,
        'x-sync-secret': config.secretKey,
      },
      body: JSON.stringify(isLocalFreshOrEmpty ? { action: 'PULL', vaultId: activeVaultId } : envelope),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        let merged: SyncPayloadData;
        if (isLocalFreshOrEmpty) {
          merged = json.data;
          applyMergedSyncPayload(merged);
        } else {
          merged = mergeSyncPayloadData(localPayload, json.data);
          applyMergedSyncPayload(merged);
        }

        if (json.vaultId && json.vaultId !== config.vaultId) {
          config.vaultId = json.vaultId;
        }
        if (overrideVaultId) {
          config.vaultId = overrideVaultId;
          config.isSyncEnabled = true;
        }
        config.lastSuccessfulSyncAt = new Date().toISOString();
        saveDeviceSyncConfig(config);

        return { success: true, mergedData: merged };
      }
    }
  } catch (apiErr) {
    console.warn('[SyncService] /api/sync endpoint notice:', apiErr);
  }

  // 2. Client-side Direct Cloud Storage Engine (Universal Resilient Fallback)
  try {
    const cleanId = cleanCloudId(activeVaultId);

    // Try fetching existing cloud vault
    let remotePayload: SyncPayloadData | null = null;
    try {
      const getRes = await fetch(`${CLOUD_STORAGE_API}/${cleanId}`);
      if (getRes.ok) {
        const item = await getRes.json();
        remotePayload = item?.data?.payload || item?.data?.data || item?.data;
      }
    } catch {}

    if (remotePayload) {
      if (isLocalFreshOrEmpty) {
        // Fresh device: adopt remote dataset directly!
        applyMergedSyncPayload(remotePayload);
        config.lastSuccessfulSyncAt = new Date().toISOString();
        if (overrideVaultId) {
          config.vaultId = overrideVaultId;
          config.isSyncEnabled = true;
        }
        saveDeviceSyncConfig(config);
        return { success: true, mergedData: remotePayload };
      }

      // Merge remote with local changes
      const merged = mergeSyncPayloadData(localPayload, remotePayload);
      applyMergedSyncPayload(merged);

      // Persist merged data back to the cloud (PUT with PATCH fallback)
      try {
        const putRes = await fetch(`${CLOUD_STORAGE_API}/${cleanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `STUDY_VAULT_${activeVaultId}`,
            data: {
              timestamp: new Date().toISOString(),
              payload: merged,
            },
          }),
        });

        if (!putRes.ok) {
          await fetch(`${CLOUD_STORAGE_API}/${cleanId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: {
                timestamp: new Date().toISOString(),
                payload: merged,
              },
            }),
          });
        }
      } catch {}

      config.lastSuccessfulSyncAt = new Date().toISOString();
      if (overrideVaultId) {
        config.vaultId = overrideVaultId;
        config.isSyncEnabled = true;
      }
      saveDeviceSyncConfig(config);

      return { success: true, mergedData: merged };

    } else {
      // Create or update cloud vault
      const postRes = await fetch(CLOUD_STORAGE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `STUDY_VAULT_${activeVaultId}`,
          data: {
            timestamp: new Date().toISOString(),
            payload: localPayload,
          },
        }),
      });

      if (postRes.ok) {
        const postJson = await postRes.json();
        if (postJson?.id && !overrideVaultId) {
          config.vaultId = `ws_${postJson.id}`;
        }
        config.lastSuccessfulSyncAt = new Date().toISOString();
        if (overrideVaultId) {
          config.vaultId = overrideVaultId;
          config.isSyncEnabled = true;
        }
        saveDeviceSyncConfig(config);

        return { success: true, mergedData: localPayload };
      }
    }
  } catch (cloudErr: any) {
    console.warn('[SyncService] Direct cloud sync notice:', cloudErr.message);
    return { success: false, error: cloudErr.message };
  }

  return { success: true, mergedData: localPayload };
}

export async function fetchRemoteWorkspace(vaultId: string): Promise<{
  success: boolean;
  mergedData?: SyncPayloadData;
  error?: string;
}> {
  return syncWithCloud(vaultId);
}
