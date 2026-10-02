// Vercel Serverless Function — Multi-Device Sync Endpoint
// Persistent Cloud Storage with Conflict-Safe Timestamp Merging

import fs from 'fs';
import path from 'path';

export const config = {
  runtime: 'nodejs',
};

// In-memory cache for ultra-fast response
const memoryVaultStore = new Map<string, { timestamp: string; data: any; cloudId?: string }>();

// Local filesystem cache directory when running on Node
const LOCAL_CACHE_DIR = path.join(process.cwd(), '.sync_vaults');

function ensureLocalCacheDir() {
  try {
    if (!fs.existsSync(LOCAL_CACHE_DIR)) {
      fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true });
    }
  } catch {}
}

function getLocalCachedVault(vaultId: string) {
  try {
    const filePath = path.join(LOCAL_CACHE_DIR, `${vaultId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function saveLocalCachedVault(vaultId: string, item: any) {
  try {
    ensureLocalCacheDir();
    const filePath = path.join(LOCAL_CACHE_DIR, `${vaultId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`);
    fs.writeFileSync(filePath, JSON.stringify(item), 'utf8');
  } catch {}
}

// --------------------------------------------------------------------------
// Cloud Persistence via Upstash / Vercel KV or Resilient Cloud Key-Value API
// --------------------------------------------------------------------------
const UPSTASH_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const CLOUD_STORAGE_API = 'https://api.restful-api.dev/objects';

async function fetchCloudVault(vaultId: string): Promise<{ timestamp: string; data: any } | null> {
  // 1. Try Upstash / Vercel KV if environment variables are set
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/studyos_${encodeURIComponent(vaultId)}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[CloudSync] Upstash fetch error:', e);
    }
  }

  // 2. Try Cloud Storage backend
  try {
    const memoryRecord = memoryVaultStore.get(vaultId);
    let cloudId = memoryRecord?.cloudId;

    if (!cloudId) {
      const local = getLocalCachedVault(vaultId);
      if (local?.cloudId) {
        cloudId = local.cloudId;
      }
    }

    if (cloudId) {
      const res = await fetch(`${CLOUD_STORAGE_API}/${cloudId}`);
      if (res.ok) {
        const item = await res.json();
        if (item?.data) {
          return item.data;
        }
      }
    }
  } catch (e) {
    console.warn('[CloudSync] Cloud storage fetch error:', e);
  }

  // 3. Fallback to local filesystem cache
  const local = getLocalCachedVault(vaultId);
  if (local?.data) {
    return { timestamp: local.timestamp, data: local.data };
  }

  // 4. In-memory fallback
  const mem = memoryVaultStore.get(vaultId);
  if (mem?.data) {
    return { timestamp: mem.timestamp, data: mem.data };
  }

  return null;
}

async function persistCloudVault(vaultId: string, payload: { timestamp: string; data: any }): Promise<void> {
  // In-memory cache
  const existingMem = memoryVaultStore.get(vaultId);
  let cloudId = existingMem?.cloudId;

  if (!cloudId) {
    const local = getLocalCachedVault(vaultId);
    if (local?.cloudId) {
      cloudId = local.cloudId;
    }
  }

  memoryVaultStore.set(vaultId, { ...payload, cloudId });
  saveLocalCachedVault(vaultId, { ...payload, cloudId });

  // 1. Try Upstash / Vercel KV if configured
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetch(`${UPSTASH_URL}/set/studyos_${encodeURIComponent(vaultId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      return;
    } catch (e) {
      console.warn('[CloudSync] Upstash persist error:', e);
    }
  }

  // 2. Persist to Cloud Storage backend
  try {
    if (cloudId) {
      const putRes = await fetch(`${CLOUD_STORAGE_API}/${cloudId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `study_vault_${vaultId}`,
          data: payload,
        }),
      });
      if (putRes.ok) return;
    }

    // Create new object
    const postRes = await fetch(CLOUD_STORAGE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `study_vault_${vaultId}`,
        data: payload,
      }),
    });

    if (postRes.ok) {
      const postJson = await postRes.json();
      if (postJson?.id) {
        cloudId = postJson.id;
        memoryVaultStore.set(vaultId, { ...payload, cloudId });
        saveLocalCachedVault(vaultId, { ...payload, cloudId });
      }
    }
  } catch (e) {
    console.warn('[CloudSync] Cloud storage persist error:', e);
  }
}

// --------------------------------------------------------------------------
// Server-side Conflict-Safe Merge Helpers
// --------------------------------------------------------------------------
function mergeEntitiesByTimestamp(local: any[] = [], remote: any[] = []): any[] {
  const map = new Map<string, any>();
  local.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  remote.forEach((item) => {
    if (!item?.id) return;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const itemTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      if (itemTime >= existingTime) {
        map.set(item.id, item);
      }
    }
  });
  return Array.from(map.values());
}

function mergeProblemsWithHistory(local: any[] = [], remote: any[] = []): any[] {
  const map = new Map<string, any>();
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

      const historyMap = new Map<string, any>();
      (localP.reviewHistory || []).forEach((r: any) => historyMap.set(r.reviewedAt || r.id, r));
      (remoteP.reviewHistory || []).forEach((r: any) => historyMap.set(r.reviewedAt || r.id, r));

      const mergedHistory = Array.from(historyMap.values()).sort(
        (a: any, b: any) => new Date(a.reviewedAt || 0).getTime() - new Date(b.reviewedAt || 0).getTime()
      );

      const base = remoteTime >= localTime ? remoteP : localP;
      map.set(remoteP.id, {
        ...base,
        reviewHistory: mergedHistory,
        reviewCount: mergedHistory.length,
      });
    }
  });
  return Array.from(map.values());
}

function serverMergePayloads(existing: any, incoming: any): any {
  if (!existing) return incoming;
  if (!incoming) return existing;

  return {
    topics: mergeEntitiesByTimestamp(existing.topics || [], incoming.topics || []),
    problems: mergeProblemsWithHistory(existing.problems || [], incoming.problems || []),
    studySessions: mergeEntitiesByTimestamp(existing.studySessions || [], incoming.studySessions || []),
    mockTests: mergeEntitiesByTimestamp(existing.mockTests || [], incoming.mockTests || []),
    dailyTargets: incoming.dailyTargets || existing.dailyTargets,
    version: Math.max(existing.version || 1, incoming.version || 1),
    exportedAt: new Date().toISOString(),
  };
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-sync-vault, x-sync-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawVault = req.headers['x-sync-vault'] || req.query.vaultId || req.query.ws;
  const vaultId = typeof rawVault === 'string' ? rawVault.trim() : null;

  if (!vaultId) {
    return res.status(400).json({ error: 'Missing x-sync-vault identifier' });
  }

  if (req.method === 'GET') {
    try {
      const stored = await fetchCloudVault(vaultId);
      if (!stored) {
        return res.status(200).json({
          vaultId,
          timestamp: new Date().toISOString(),
          data: null,
        });
      }
      return res.status(200).json({
        vaultId,
        timestamp: stored.timestamp,
        data: stored.data,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Fetch failed' });
    }
  }

  if (req.method === 'POST') {
    try {
      const envelope = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const incomingData = envelope?.data;

      if (!incomingData) {
        return res.status(400).json({ error: 'Invalid sync envelope payload' });
      }

      const existingRecord = await fetchCloudVault(vaultId);
      const mergedData = existingRecord?.data
        ? serverMergePayloads(existingRecord.data, incomingData)
        : incomingData;

      const timestamp = new Date().toISOString();
      await persistCloudVault(vaultId, { timestamp, data: mergedData });

      return res.status(200).json({
        success: true,
        vaultId,
        timestamp,
        data: mergedData,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Sync storage failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
