// frontend/src/utils/storageSync.js

export const StorageService = {
  getItem: (key, fallback = []) => {
    try {
      const data = localStorage.getItem(key);
      return data !== null && data !== undefined ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Storage read error for ${key}:`, e);
      return fallback;
    }
  },

  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key, value } }));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(`Storage write error for ${key}:`, e);
    }
  },

  getActiveFirmId: () => {
    return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  },

  // Firm-Scoped Inventory Items (Zero Cross-Firm Pollution)
  getInventoryItems: (firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    return StorageService.getItem(`inventory_items_${fId}`, []);
  },

  saveInventoryItems: (items, firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    StorageService.setItem(`inventory_items_${fId}`, items);
  },

  // Firm-Scoped Material Consumptions (Coal, Fuel, Biomass, Raw Dust)
  getMaterialConsumptions: (firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    return StorageService.getItem(`material_consumptions_${fId}`, []);
  },

  saveMaterialConsumptions: (list, firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    StorageService.setItem(`material_consumptions_${fId}`, list);
  },

  // Firm-Scoped Ledger Accounts
  getLedgerAccounts: (firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    return StorageService.getItem(`app_accounts_${fId}`, []);
  },

  saveLedgerAccounts: (accounts, firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    StorageService.setItem(`app_accounts_${fId}`, accounts);
  }
};
