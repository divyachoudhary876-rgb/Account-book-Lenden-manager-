// frontend/src/utils/storageSync.js
export const StorageService = {
  getItem: (key, fallback = []) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  },

  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key, value } }));
    } catch (e) {
      console.error(`Storage write error for ${key}:`, e);
    }
  },

  getInventoryItems: () => StorageService.getItem('inventory_items', []),
  saveInventoryItems: (items) => StorageService.setItem('inventory_items', items),
  
  getMaterialConsumptions: () => StorageService.getItem('material_consumptions', []),
  saveMaterialConsumptions: (list) => StorageService.setItem('material_consumptions', list),

  getLedgerAccounts: () => StorageService.getItem('ledger_accounts', [])
};
