/**
 * Advanced Hybrid IndexedDB Storage Engine for Account Book Smart Manager
 * Optimized with Non-Blocking Asynchronous Writes & Debounced Event Dispatching.
 */

const DB_NAME = 'AccountBookERP_DB';
const STORE_NAME = 'storage_store';
const DB_VERSION = 1;

let dbInstance = null;
window.__APP_STORAGE_CACHE__ = window.__APP_STORAGE_CACHE__ || {};

// Debounce timer to prevent cascading event storms and mobile UI freezing during rapid data entry
let eventDebounceTimer = null;
const dispatchStorageEvents = (key, value) => {
  if (eventDebounceTimer) clearTimeout(eventDebounceTimer);
  eventDebounceTimer = setTimeout(() => {
    try {
      window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key, value } }));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  }, 50); // Batched 50ms window
};

export const initIndexedDB = () => {
  return new Promise((resolve) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    if (!window.indexedDB) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => resolve(null);

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
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
  getItem: (key, fallback = []) => {
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
      // 1. Instant Memory Cache update
      window.__APP_STORAGE_CACHE__[key] = value;
      
      // 2. Fast non-blocking localStorage write
      try {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        localStorage.setItem(key, serialized);
      } catch (e) {}

      // 3. Background asynchronous IndexedDB write (Non-blocking)
      if (dbInstance) {
        try {
          const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.put(value, key);
        } catch (e) {}
      }

      // 4. Safe batched event dispatching
      dispatchStorageEvents(key, value);
    } catch (e) {}
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
