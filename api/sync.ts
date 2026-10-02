// Vercel Serverless Function — Multi-Device Sync Endpoint
// Persistent Cloud Storage with Conflict-Safe Timestamp Merging

export const config = {
  runtime: 'nodejs',
};

const CLOUD_STORAGE_API = 'https://api.restful-api.dev/objects';

const UPSTASH_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function cleanCloudId(vaultId: string): string {
  return vaultId.replace(/^ws_/i, '').trim();
}

// --------------------------------------------------------------------------
// Cloud Persistence Core
// --------------------------------------------------------------------------
async function fetchCloudVault(vaultId: string): Promise<{ timestamp: string; data: any } | null> {
  const cleanId = cleanCloudId(vaultId);

  // 1. Try Upstash / Vercel KV if configured
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

  // 2. Try Cloud REST storage
  try {
    const res = await fetch(`${CLOUD_STORAGE_API}/${cleanId}`);
    if (res.ok) {
      const item = await res.json();
      if (item?.data?.payload) {
        return {
          timestamp: item.data.timestamp || new Date().toISOString(),
          data: item.data.payload,
        };
      } else if (item?.data) {
        return {
          timestamp: item.data.timestamp || new Date().toISOString(),
          data: item.data.data || item.data,
        };
      }
    }
  } catch (e) {
    console.warn('[CloudSync] Cloud storage fetch error:', e);
  }

  return null;
}

async function persistCloudVault(
  vaultId: string,
  payload: { timestamp: string; data: any }
): Promise<string> {
  const cleanId = cleanCloudId(vaultId);

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
    } catch (e) {
      console.warn('[CloudSync] Upstash persist error:', e);
    }
  }

  // 2. Persist to Cloud REST storage
  try {
    // Try updating existing object first
    const putRes = await fetch(`${CLOUD_STORAGE_API}/${cleanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `STUDY_VAULT_${vaultId}`,
        data: {
          timestamp: payload.timestamp,
          payload: payload.data,
        },
      }),
    });

    if (putRes.ok) {
      return vaultId;
    }

    // If PUT 404s (new vault), create new object
    const postRes = await fetch(CLOUD_STORAGE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `STUDY_VAULT_${vaultId}`,
        data: {
          timestamp: payload.timestamp,
          payload: payload.data,
        },
      }),
    });

    if (postRes.ok) {
      const postJson = await postRes.json();
      if (postJson?.id) {
        return `ws_${postJson.id}`;
      }
    }
  } catch (e) {
    console.warn('[CloudSync] Cloud storage persist error:', e);
  }

  return vaultId;
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

  if (req.method === 'GET') {
    if (!vaultId) {
      return res.status(400).json({ error: 'Missing x-sync-vault identifier' });
    }
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
      const effectiveVaultId = vaultId || envelope?.vaultId;

      if (!incomingData) {
        return res.status(400).json({ error: 'Invalid sync envelope payload' });
      }

      let mergedData = incomingData;
      if (effectiveVaultId) {
        const existingRecord = await fetchCloudVault(effectiveVaultId);
        if (existingRecord?.data) {
          mergedData = serverMergePayloads(existingRecord.data, incomingData);
        }
      }

      const timestamp = new Date().toISOString();
      const activeVaultId = await persistCloudVault(effectiveVaultId || 'new', { timestamp, data: mergedData });

      return res.status(200).json({
        success: true,
        vaultId: activeVaultId,
        timestamp,
        data: mergedData,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Sync storage failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

