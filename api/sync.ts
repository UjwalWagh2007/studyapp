// Vercel Serverless Function — Multi-Device Sync Endpoint
// Multi-Tiered Resilient Cloud Storage with Conflict-Safe Timestamp Merging & Deletion Tracking

export const config = {
  runtime: 'nodejs',
};

let PRIMARY_CLOUD_URL = 'https://crudcrud.com/api/baf9e4d1a6974f3f8784bcb31bcfdb63/vault/6ac0859aac1fb503e88e23fc';
const FALLBACK_RESTFUL_API = 'https://api.restful-api.dev/objects/ff808181a09d98f701a0ffdfab106797';

const UPSTASH_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// --------------------------------------------------------------------------
// Cloud Persistence Core (Multi-Tier Redundant Engine)
// --------------------------------------------------------------------------
async function fetchCloudVault(_vaultId?: string | null): Promise<{ timestamp: string; data: any } | null> {
  // 1. Try Upstash / Vercel KV if configured in env
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/studyos_master_vault`, {
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

  // 2. Try Primary Cloud JSON Store
  try {
    const res = await fetch(PRIMARY_CLOUD_URL);
    if (res.ok) {
      const item = await res.json();
      if (item?.payload || item?.data) {
        return {
          timestamp: item.timestamp || new Date().toISOString(),
          data: item.payload || item.data,
        };
      }
    }
  } catch (e) {
    console.warn('[CloudSync] Primary cloud fetch error:', e);
  }

  // 3. Auto-heal Primary Cloud JSON Store if needed
  try {
    const homeRes = await fetch('https://crudcrud.com');
    if (homeRes.ok) {
      const text = await homeRes.text();
      const match = text.match(/api\/([a-f0-9]{32})/);
      if (match) {
        const endpoint = match[1];
        const postRes = await fetch(`https://crudcrud.com/api/${endpoint}/vault`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            payload: { topics: [], problems: [], studySessions: [], mockTests: [], deletedIds: [] },
          }),
        });
        if (postRes.ok) {
          const created = await postRes.json();
          if (created?._id) {
            PRIMARY_CLOUD_URL = `https://crudcrud.com/api/${endpoint}/vault/${created._id}`;
            return {
              timestamp: created.timestamp,
              data: created.payload,
            };
          }
        }
      }
    }
  } catch {}

  // 4. Try Secondary Fallback Store
  try {
    const res = await fetch(FALLBACK_RESTFUL_API);
    if (res.ok) {
      const item = await res.json();
      if (item?.data?.payload) {
        return {
          timestamp: item.data.timestamp || new Date().toISOString(),
          data: item.data.payload,
        };
      }
    }
  } catch (e) {
    console.warn('[CloudSync] Fallback fetch error:', e);
  }

  return null;
}

async function persistCloudVault(
  _vaultId: string,
  payload: { timestamp: string; data: any }
): Promise<string> {
  // 1. Try Upstash / Vercel KV if configured
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetch(`${UPSTASH_URL}/set/studyos_master_vault`, {
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

  // 2. Persist to Primary Cloud JSON Store
  try {
    const putRes = await fetch(PRIMARY_CLOUD_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: payload.timestamp,
        payload: payload.data,
      }),
    });

    if (putRes.ok) {
      return 'ws_master_vault';
    }
  } catch (e) {
    console.warn('[CloudSync] Primary cloud persist error:', e);
  }

  // 3. Fallback Persist to Secondary Store
  try {
    await fetch(FALLBACK_RESTFUL_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'STUDY_VAULT_MASTER',
        data: {
          timestamp: payload.timestamp,
          payload: payload.data,
        },
      }),
    });
  } catch (e) {
    console.warn('[CloudSync] Fallback persist error:', e);
  }

  return 'ws_master_vault';
}

// --------------------------------------------------------------------------
// Server-side Conflict-Safe Merge Helpers
// --------------------------------------------------------------------------
function mergeEntitiesByTimestamp(local: any[] = [], remote: any[] = [], deletedSet: Set<string>): any[] {
  const map = new Map<string, any>();

  local.forEach((item) => {
    if (item?.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    }
  });

  remote.forEach((item) => {
    if (!item?.id || deletedSet.has(item.id)) return;
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

function mergeProblemsWithHistory(local: any[] = [], remote: any[] = [], deletedSet: Set<string>): any[] {
  const map = new Map<string, any>();

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

  const deletedList = Array.from(
    new Set([...(existing.deletedIds || []), ...(incoming.deletedIds || [])])
  ).slice(0, 300);
  const deletedSet = new Set(deletedList);

  return {
    topics: mergeEntitiesByTimestamp(incoming.topics || [], existing.topics || [], deletedSet),
    problems: mergeProblemsWithHistory(incoming.problems || [], existing.problems || [], deletedSet),
    studySessions: mergeEntitiesByTimestamp(incoming.studySessions || [], existing.studySessions || [], deletedSet),
    mockTests: mergeEntitiesByTimestamp(incoming.mockTests || [], existing.mockTests || [], deletedSet),
    dailyTargets: incoming.dailyTargets || existing.dailyTargets,
    deletedIds: deletedList,
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

  const vaultId = 'ws_master_vault';

  if (req.method === 'GET') {
    try {
      const stored = await fetchCloudVault(vaultId);
      if (!stored || !stored.data) {
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
      const isPullOnly = envelope?.action === 'PULL' || !incomingData;

      // If client only requested a pull or has empty incoming data on fresh device:
      if (isPullOnly) {
        const existingRecord = await fetchCloudVault(vaultId);
        return res.status(200).json({
          success: true,
          vaultId,
          timestamp: existingRecord?.timestamp || new Date().toISOString(),
          data: existingRecord?.data || null,
        });
      }

      let mergedData = incomingData;
      const existingRecord = await fetchCloudVault(vaultId);
      if (existingRecord?.data) {
        mergedData = serverMergePayloads(existingRecord.data, incomingData);
      }

      const timestamp = new Date().toISOString();
      const activeVaultId = await persistCloudVault(vaultId, { timestamp, data: mergedData });

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
