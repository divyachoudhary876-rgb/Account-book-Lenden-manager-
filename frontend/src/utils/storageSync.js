// frontend/src/utils/storageSync.js

/**
 * Centralized Storage State Manager with Cross-Tab & Component Reactivity
 */
export const StorageService = {
  getItem: (key, fallback = []) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return fallback;
    }
  },

  setItem: (key, value) => {
    try {
      const jsonString = JSON.stringify(value);
      localStorage.setItem(key, jsonString);
      // Dispatch custom event for immediate React component reactivity in same window
      window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key, value } }));
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
    }
  },

  getInventoryItems: () => StorageService.getItem('inventory_items', []),
  
  saveInventoryItems: (items) => StorageService.setItem('inventory_items', items),

  getMaterialConsumptions: () => StorageService.getItem('material_consumptions', []),

  saveMaterialConsumptions: (consumptions) => StorageService.setItem('material_consumptions', consumptions),

  getLedgerAccounts: () => StorageService.getItem('ledger_accounts', [])
};
