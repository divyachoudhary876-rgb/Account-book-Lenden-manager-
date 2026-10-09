/**
 * Advanced Hybrid IndexedDB Storage Engine for Account Book Smart Manager
 * Bypasses localStorage 10MB quota limit completely while maintaining synchronous UI support.
 */

const DB_NAME = 'AccountBookERP_DB';
const STORE_NAME = 'storage_store';
const DB_VERSION = 1;

let dbInstance = null;
window.__APP_STORAGE_CACHE__ = window.__APP_STORAGE_CACHE__ || {};

export const initIndexedDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    if (!window.indexedDB) {
      console.error("IndexedDB is not supported in this browser.");
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB open error:", event.target.error);
      resolve(null);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      // Load all items into memory cache for instant synchronous access
      loadAllIntoCache().then(() => resolve(dbInstance));
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
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
  getItem: (key, fallback = []) => {
    const cached = window.__APP_STORAGE_CACHE__[key];
    if (cached !== undefined && cached !== null) {
      try {
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
      } catch (e) {
        return cached;
      }
    }
    // Fallback to localStorage if not yet in IDB cache
    try {
      const local = localStorage.getItem(key);
      if (local !== null) {
        const parsed = JSON.parse(local);
        window.__APP_STORAGE_CACHE__[key] = parsed;
        return parsed;
      }
    } catch (e) {}
    return fallback;
  },

  setItem: (key, value) => {
    try {
      // Update memory cache instantly
      window.__APP_STORAGE_CACHE__[key] = value;
      
      // Also write to localStorage as a lightweight shadow cache if small, else skip to prevent quota error
      try {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (serialized.length < 2000000) { // under 2MB
          localStorage.setItem(key, serialized);
        }
      } catch (e) {}

      // Asynchronously persist to IndexedDB (Bypassing 10MB limit)
      if (dbInstance) {
        const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(value, key);
      }

      window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key, value } }));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(`IDBStorage write error for ${key}:`, e);
    }
  },

  removeItem: (key) => {
    delete window.__APP_STORAGE_CACHE__[key];
    try { localStorage.removeItem(key); } catch (e) {}
    if (dbInstance) {
      try {
        const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(key);
      } catch (e) {}
    }
  }
};
