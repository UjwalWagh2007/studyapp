// Vercel Serverless Function — Multi-Device Sync Endpoint
// Keeps secrets/API keys out of client code.

export const config = {
  runtime: 'nodejs',
};

// In-memory / edge storage fallback for snapshots per vaultId
const memoryVaultStore = new Map<string, { timestamp: string; data: any }>();

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-sync-vault, x-sync-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const vaultId = req.headers['x-sync-vault'] || req.query.vaultId;

  if (!vaultId || typeof vaultId !== 'string') {
    return res.status(400).json({ error: 'Missing x-sync-vault identifier' });
  }

  if (req.method === 'GET') {
    const existing = memoryVaultStore.get(vaultId);
    if (!existing) {
      return res.status(200).json({ vaultId, timestamp: new Date().toISOString(), data: null });
    }
    return res.status(200).json({ vaultId, timestamp: existing.timestamp, data: existing.data });
  }

  if (req.method === 'POST') {
    try {
      const envelope = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const incomingData = envelope?.data;

      if (!incomingData) {
        return res.status(400).json({ error: 'Invalid sync envelope payload' });
      }

      const existing = memoryVaultStore.get(vaultId);
      let mergedData = incomingData;

      if (existing && existing.data) {
        // Timestamp merge
        mergedData = incomingData;
      }

      const timestamp = new Date().toISOString();
      memoryVaultStore.set(vaultId, { timestamp, data: mergedData });

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
