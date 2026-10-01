/**
 * PERSONAL STUDY & CODING OS — INDEXEDDB PERSISTENCE ENGINE
 * Long-term, high-quota, resilient local database architecture (4+ years).
 */

const DB_NAME = 'PersonalStudyOS_DB';
const DB_VERSION = 1;

export const STORES = [
  'topics',
  'questions',
  'mistakes',
  'insights',
  'mockTests',
  'goals',
  'dailyTargets',
  'studySessions',
  'platformAccounts',
  'contestRecords',
  'contestJournal',
  'notificationPreferences',
  'settings',
  'syncVault',
  'syncQueue',
] as const;

export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          // Singleton stores use keyPath null; entity collections use 'id'
          if (
            storeName === 'dailyTargets' ||
            storeName === 'notificationPreferences' ||
            storeName === 'settings' ||
            storeName === 'syncVault'
          ) {
            db.createObjectStore(storeName);
          } else {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      });
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Retrieve all items from an entity collection store.
 */
export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  if (typeof window === 'undefined' || !window.indexedDB) return [];
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Save an entire collection of items into an entity collection store.
 */
export async function dbSetAll<T extends { id: string }>(
  storeName: StoreName,
  items: T[]
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      // Clear existing records in store to maintain exact collection state
      store.clear();

      items.forEach((item) => {
        store.put(item);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

/**
 * Retrieve a singleton object (settings, dailyTargets, etc.).
 */
export async function dbGetSingleton<T>(storeName: StoreName, key: string = 'root'): Promise<T | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Save a singleton object.
 */
export async function dbSetSingleton<T>(
  storeName: StoreName,
  value: T,
  key: string = 'root'
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value, key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}
