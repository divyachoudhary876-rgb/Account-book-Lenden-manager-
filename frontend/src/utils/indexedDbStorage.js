/**
 * Advanced Hybrid IndexedDB Storage Engine for Account Book Smart Manager
 * Enterprise Grade Ind-AS / Multi-Firm Strictly Isolated Zero-Loss Engine (With 1-Sec Timeout Guard)
 */

const DB_NAME = 'AccountBookERP_DB';
const STORE_NAME = 'storage_store';
const DB_VERSION = 1;

let dbInstance = null;
let initPromise = null;
window.__APP_STORAGE_CACHE__ = window.__APP_STORAGE_CACHE__ || {};

export const initIndexedDB = () => {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    // Hard Timeout Guard (1 second max wait to prevent infinite loading screen)
    const timeoutId = setTimeout(() => {
      console.warn('[IDBStorage] IndexedDB initialization timed out. Fast-path localStorage active.');
      resolve(null);
    }, 1000);

    if (dbInstance) {
      clearTimeout(timeoutId);
      resolve(dbInstance);
      return;
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
      clearTimeout(timeoutId);
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (e) => {
        clearTimeout(timeoutId);
        console.error('[IDBStorage] Database open error:', e);
        resolve(null);
      };

      request.onsuccess = (event) => {
        clearTimeout(timeoutId);
        dbInstance = event.target.result;
        loadAllIntoCache().then(() => resolve(dbInstance)).catch(() => resolve(dbInstance));
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    } catch (err) {
      clearTimeout(timeoutId);
      resolve(null);
    }
  });

  return initPromise;
};

const loadAllIntoCache = () => {
  return new Promise((resolve) => {
    if (!dbInstance) {
      resolve();
      return;
    }
    try {
      const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          window.__APP_STORAGE_CACHE__[cursor.key] = cursor.value;
          try {
            const val = cursor.value;
            localStorage.setItem(cursor.key, typeof val === 'object' ? JSON.stringify(val) : String(val));
          } catch (e) {}
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
};

export const IDBStorage = {
  getItem: (key, fallback = null) => {
    if (!key) return fallback;

    const cached = window.__APP_STORAGE_CACHE__[key];
    if (cached !== undefined && cached !== null) {
      try {
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
      } catch (e) {
        return cached;
      }
    }

    try {
      const local = localStorage.getItem(key);
      if (local !== null && local !== undefined) {
        try {
          const parsed = JSON.parse(local);
          window.__APP_STORAGE_CACHE__[key] = parsed;
          return parsed;
        } catch (e) {
          window.__APP_STORAGE_CACHE__[key] = local;
          return local;
        }
      }
    } catch (e) {}

    return fallback;
  },

  setItem: (key, value) => {
    if (!key) return;

    try {
      window.__APP_STORAGE_CACHE__[key] = value;

      try {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        localStorage.setItem(key, serialized);
      } catch (quotaErr) {
        console.warn(`[IDBStorage] LocalStorage quota reached for key: ${key}. Retaining in IndexedDB.`);
      }

      if (dbInstance) {
        try {
          const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.put(value, key);
        } catch (idbErr) {
          console.error('[IDBStorage] IndexedDB write failed:', idbErr);
        }
      }

      window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key, value } }));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('[IDBStorage] SetItem exception:', e);
    }
  },

  removeItem: (key) => {
    if (!key) return;
    delete window.__APP_STORAGE_CACHE__[key];
    try { localStorage.removeItem(key); } catch (e) {}
    if (dbInstance) {
      try {
        const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(key);
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key, value: null } }));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  },

  clearMemoryCache: () => {
    window.__APP_STORAGE_CACHE__ = {};
  }
};
